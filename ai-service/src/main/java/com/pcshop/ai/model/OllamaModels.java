package com.pcshop.ai.model;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pcshop.contracts.BusinessException;
import com.pcshop.contracts.ErrorCode;
import io.quarkus.runtime.ShutdownEvent;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Tự chuẩn bị model Ollama khi ai-service khởi động, để máy mới không phải gõ `ollama pull` tay.
 * <p>
 * Chạy nền (không chặn khởi động): hỏi Ollama đang có model nào ({@code GET /api/tags}), thiếu thì tải
 * ({@code POST /api/pull}, ghi tiến độ ra log). Nếu chat model là model tùy chỉnh {@code pcshop.ai.models.custom.name}
 * (vd pcshop-qwen chạy CPU) thì tải model gốc rồi tạo bằng {@code POST /api/create} kèm tham số num_gpu / num_ctx
 * (quarkus-langchain4j-ollama không cấu hình được hai tham số này). Ollama chưa chạy thì thử lại mỗi 30 giây.
 * <p>
 * Trong lúc đang tải, chat và nạp dữ liệu RAG báo "đang tải model" qua {@link #requireReady()} thay vì lỗi khó hiểu.
 * Ollama vẫn phải được cài trên máy (hoặc chạy bằng docker compose --profile ai).
 */
@ApplicationScoped
public class OllamaModels {

    private static final Logger LOG = Logger.getLogger(OllamaModels.class);
    private static final Duration RETRY = Duration.ofSeconds(30);

    public enum State {
        /** pcshop.ai.models.auto-pull=false: không kiểm tra gì */
        DISABLED,
        CHECKING,
        /** đang tải hoặc tạo model: chat tạm từ chối */
        PREPARING,
        READY,
        /** chưa kết nối được Ollama, đang thử lại */
        OLLAMA_UNAVAILABLE,
        FAILED
    }

    public record Status(State state, String model, Integer percent, String error) {
    }

    @ConfigProperty(name = "pcshop.ai.models.auto-pull", defaultValue = "true")
    boolean autoPull;

    @ConfigProperty(name = "quarkus.langchain4j.ollama.base-url")
    String baseUrl;

    @ConfigProperty(name = "quarkus.langchain4j.ollama.chat-model.model-id")
    String chatModel;

    @ConfigProperty(name = "quarkus.langchain4j.ollama.embedding-model.model-id")
    String embeddingModel;

    @ConfigProperty(name = "pcshop.ai.models.custom.name")
    Optional<String> customName;

    @ConfigProperty(name = "pcshop.ai.models.custom.from")
    Optional<String> customFrom;

    @ConfigProperty(name = "pcshop.ai.models.custom.num-gpu")
    Optional<Integer> customNumGpu;

    @ConfigProperty(name = "pcshop.ai.models.custom.num-ctx")
    Optional<Integer> customNumCtx;

    @Inject
    ObjectMapper json;

    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
    private volatile Status status = new Status(State.CHECKING, null, null, null);
    private volatile boolean stopped;
    private volatile Thread worker;
    /** luồng đang đọc tiến độ pull: đóng khi tắt service để luồng nền dừng ngay */
    private volatile InputStream pulling;

    void onStart(@Observes StartupEvent event) {
        if (!autoPull) {
            status = new Status(State.DISABLED, null, null, null);
            return;
        }
        worker = new Thread(this::prepare, "ollama-models");
        worker.setDaemon(true);
        worker.start();
    }

    void onStop(@Observes ShutdownEvent event) {
        stopped = true;
        closeQuietly(pulling);
        if (worker != null) {
            worker.interrupt();
        }
    }

    public Status status() {
        return status;
    }

    /** Gọi trước khi dùng LLM/embedding: đang tải model thì báo cho người dùng biết, các trạng thái khác cho đi tiếp. */
    public void requireReady() {
        Status s = status;
        if (s.state() == State.PREPARING) {
            String progress = s.percent() == null ? "" : " " + s.percent() + "%";
            throw new BusinessException(ErrorCode.EXTERNAL_SERVICE_ERROR,
                    "Trợ lý AI đang tải model " + s.model() + progress + ", vui lòng thử lại sau ít phút.");
        }
    }

    private void prepare() {
        boolean warned = false;
        while (!stopped) {
            try {
                Set<String> installed = installedModels();
                Set<String> required = new LinkedHashSet<>();
                required.add(chatModel);
                required.add(embeddingModel);
                for (String model : required) {
                    ensure(model, installed);
                }
                status = new Status(State.READY, null, null, null);
                LOG.infof("Model Ollama sẵn sàng: %s", required);
                return;
            } catch (IOException e) {
                if (stopped) {
                    return;
                }
                // ConnectException không có message: lấy tên lớp cho log dễ hiểu
                String reason = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
                status = new Status(State.OLLAMA_UNAVAILABLE, null, null, reason);
                if (!warned) {
                    LOG.warnf("Chưa kết nối được Ollama ở %s (%s). Cài/bật Ollama, ai-service sẽ tự thử lại mỗi %d giây.",
                            baseUrl, reason, RETRY.toSeconds());
                    warned = true;
                }
                if (!sleep()) {
                    return;
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return;
            } catch (RuntimeException e) {
                status = new Status(State.FAILED, status.model(), null, e.getMessage());
                LOG.errorf(e, "Không chuẩn bị được model Ollama. Tải tay bằng `ollama pull <model>` rồi khởi động lại ai-service.");
                return;
            }
        }
    }

    /** Có rồi thì bỏ qua; là model tùy chỉnh thì tải model gốc rồi tạo; còn lại thì pull. */
    private void ensure(String model, Set<String> installed) throws IOException, InterruptedException {
        if (installed.contains(normalize(model))) {
            return;
        }
        if (customName.isPresent() && normalize(customName.get()).equals(normalize(model))) {
            String from = customFrom.orElseThrow(() -> new IllegalStateException(
                    "Thiếu pcshop.ai.models.custom.from để tạo model " + model));
            if (!installed.contains(normalize(from))) {
                pull(from);
                installed.add(normalize(from));
            }
            create(model, from);
        } else {
            pull(model);
        }
        installed.add(normalize(model));
    }

    private Set<String> installedModels() throws IOException, InterruptedException {
        HttpRequest request = HttpRequest.newBuilder(uri("/api/tags")).timeout(Duration.ofSeconds(10)).GET().build();
        HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200) {
            throw new IOException("GET /api/tags trả HTTP " + response.statusCode());
        }
        Set<String> names = new HashSet<>();
        for (JsonNode m : json.readTree(response.body()).path("models")) {
            names.add(normalize(m.path("name").asText()));
        }
        return names;
    }

    /** POST /api/pull dạng stream: mỗi dòng một JSON {status, total, completed} hoặc {error}. */
    private void pull(String model) throws IOException, InterruptedException {
        LOG.infof("Ollama chưa có model %s, bắt đầu tải (lần đầu có thể mất vài phút đến vài chục phút)...", model);
        status = new Status(State.PREPARING, model, null, null);
        HttpRequest request = HttpRequest.newBuilder(uri("/api/pull"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(Map.of("model", model, "stream", true))))
                .build();
        HttpResponse<InputStream> response = http.send(request, HttpResponse.BodyHandlers.ofInputStream());
        pulling = response.body();
        int lastLogged = -10;
        // mỗi lớp (digest) báo tiến độ riêng; cộng dồn để % không tụt về 0 khi chuyển sang lớp nhỏ phía sau
        Map<String, long[]> layers = new LinkedHashMap<>();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(response.body(), StandardCharsets.UTF_8))) {
            if (response.statusCode() != 200) {
                throw new IllegalStateException("Tải " + model + " lỗi: HTTP " + response.statusCode() + " " + reader.readLine());
            }
            String line;
            while ((line = reader.readLine()) != null) {
                JsonNode node = json.readTree(line);
                if (node.hasNonNull("error")) {
                    throw new IllegalStateException("Tải " + model + " lỗi: " + node.get("error").asText());
                }
                long layerTotal = node.path("total").asLong(0);
                if (layerTotal > 0) {
                    layers.put(node.path("digest").asText(""), new long[]{node.path("completed").asLong(0), layerTotal});
                    long done = layers.values().stream().mapToLong(v -> v[0]).sum();
                    long total = layers.values().stream().mapToLong(v -> v[1]).sum();
                    int percent = (int) (done * 100 / total);
                    status = new Status(State.PREPARING, model, percent, null);
                    if (percent >= lastLogged + 10) {
                        LOG.infof("Đang tải %s: %d%% (%d MB)", model, percent, total / 1_048_576);
                        lastLogged = percent - percent % 10;
                    }
                }
                if ("success".equals(node.path("status").asText())) {
                    LOG.infof("Đã tải xong model %s", model);
                    return;
                }
            }
        } finally {
            pulling = null;
        }
        if (stopped) {
            throw new InterruptedException("ai-service đang tắt");
        }
        throw new IllegalStateException("Tải " + model + " bị ngắt giữa chừng");
    }

    /** POST /api/create: model mới dùng lại trọng số của model gốc (không tốn thêm dung lượng), chỉ khác tham số. */
    private void create(String model, String from) throws IOException, InterruptedException {
        Map<String, Object> parameters = new LinkedHashMap<>();
        customNumGpu.ifPresent(v -> parameters.put("num_gpu", v));
        customNumCtx.ifPresent(v -> parameters.put("num_ctx", v));
        LOG.infof("Tạo model %s từ %s với tham số %s", model, from, parameters);
        status = new Status(State.PREPARING, model, null, null);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", model);
        body.put("from", from);
        body.put("parameters", parameters);
        body.put("stream", false);
        HttpRequest request = HttpRequest.newBuilder(uri("/api/create"))
                .header("Content-Type", "application/json")
                .timeout(Duration.ofMinutes(5))
                .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)))
                .build();
        HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200) {
            throw new IllegalStateException("Tạo " + model + " lỗi: HTTP " + response.statusCode() + " " + response.body());
        }
    }

    /** Ollama ghi tên kèm tag (bge-m3:latest), cấu hình thường bỏ tag */
    static String normalize(String name) {
        String n = name.trim().toLowerCase();
        return n.contains(":") ? n : n + ":latest";
    }

    private URI uri(String path) {
        return URI.create(baseUrl.replaceAll("/+$", "") + path);
    }

    private boolean sleep() {
        try {
            Thread.sleep(RETRY.toMillis());
            return !stopped;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return false;
        }
    }

    private static void closeQuietly(InputStream in) {
        if (in != null) {
            try {
                in.close();
            } catch (IOException ignored) {
                // đang tắt service
            }
        }
    }
}
