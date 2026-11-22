package com.pcshop.ai.assistant;

import com.pcshop.ai.chat.ChatTracker;
import com.pcshop.ai.client.ShopClients.CatalogClient;
import com.pcshop.ai.client.ShopClients.CompatibilityClient;
import com.pcshop.ai.client.ShopClients.CompatibilityIssue;
import com.pcshop.ai.client.ShopClients.CompatibilityRequest;
import com.pcshop.ai.client.ShopClients.CompatibilityResult;
import com.pcshop.ai.client.ShopClients.InventoryClient;
import com.pcshop.ai.client.ShopClients.ProductView;
import com.pcshop.ai.client.ShopClients.StockView;
import dev.langchain4j.agent.tool.P;
import dev.langchain4j.agent.tool.Tool;
import dev.langchain4j.agent.tool.ToolMemoryId;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.WebApplicationException;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.jboss.logging.Logger;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

/**
 * Tool cho LLM gọi (tool calling). GIÁ, TỒN KHO và TƯƠNG THÍCH luôn lấy realtime từ service khác,
 * KHÔNG lấy từ vector store, để LLM không "bịa" (plan mục 5.2).
 * Tool trả về chuỗi ngắn gọn, dễ cho LLM đọc; lỗi thì trả lời rõ là không lấy được, không ném exception.
 * Mỗi lần gọi được ghi vào {@link ChatTracker} (tham số @ToolMemoryId = sessionId) để lưu ai_request_logs.
 */
@ApplicationScoped
public class ShopTools {

    private static final Logger LOG = Logger.getLogger(ShopTools.class);
    private static final int ACTIVE = 2;
    private static final int ERROR = 1;
    private static final int MAX_FOUND = 8;

    @Inject
    @RestClient
    CatalogClient catalog;

    @Inject
    @RestClient
    CompatibilityClient compatibility;

    @Inject
    @RestClient
    InventoryClient inventory;

    @Inject
    ChatTracker tracker;

    @Tool("Lấy giá bán hiện tại của một sản phẩm theo mã SKU")
    public String getPrice(@ToolMemoryId String sessionId, @P("Mã SKU, ví dụ GPU-MSI-4070S-12G") String sku) {
        tracker.progress(sessionId, "Đang tra giá " + sku);
        String result;
        try {
            ProductView p = catalog.bySku(sku).data();
            result = p == null || p.status() == null || p.status() != ACTIVE
                    ? "Sản phẩm " + sku + " hiện không còn bán."
                    : p.name() + " (" + sku + ") giá " + vnd(p.price());
        } catch (WebApplicationException e) {
            result = notFoundOr(e, "Không có sản phẩm nào mã " + sku + " đang bán.", "Không lấy được giá của " + sku + " lúc này.");
        } catch (Exception e) {
            LOG.warnf("getPrice(%s) failed: %s", sku, e.getMessage());
            result = "Không lấy được giá của " + sku + " lúc này.";
        }
        tracker.tool(sessionId, "getPrice", sku, result);
        return result;
    }

    @Tool("Kiểm tra sản phẩm còn hàng không và còn bao nhiêu, theo mã SKU")
    public String checkStock(@ToolMemoryId String sessionId, @P("Mã SKU") String sku) {
        tracker.progress(sessionId, "Đang kiểm tra tồn kho " + sku);
        String result;
        try {
            StockView s = inventory.stock(sku).data();
            result = s.inStock() ? sku + " còn " + s.available() + " sản phẩm." : sku + " hiện đã hết hàng.";
        } catch (WebApplicationException e) {
            result = notFoundOr(e, "Kho chưa có thông tin của " + sku + ".", "Không kiểm tra được tồn kho của " + sku + " lúc này.");
        } catch (Exception e) {
            LOG.warnf("checkStock(%s) failed: %s", sku, e.getMessage());
            result = "Không kiểm tra được tồn kho của " + sku + " lúc này.";
        }
        tracker.tool(sessionId, "checkStock", sku, result);
        return result;
    }

    /**
     * Kết luận do RULE ENGINE TẤT ĐỊNH của catalog đưa ra (compatibility_rules); LLM chỉ diễn giải lại.
     */
    @Tool("Kiểm tra các linh kiện có lắp được với nhau không. Truyền danh sách mã SKU của cả cấu hình; "
            + "một SKU lặp lại nghĩa là mua nhiều chiếc (vd 2 kit RAM)")
    public String checkCompatibility(@ToolMemoryId String sessionId,
                                     @P("Danh sách mã SKU của cấu hình") List<String> skus) {
        tracker.progress(sessionId, "Đang kiểm tra độ tương thích của cấu hình");
        String result;
        try {
            CompatibilityResult r = compatibility.check(new CompatibilityRequest(skus)).data();
            result = describe(r);
        } catch (WebApplicationException e) {
            result = notFoundOr(e, "Có mã SKU không tồn tại hoặc đã ngừng bán trong " + skus
                            + ". Hãy hỏi lại khách đúng mã sản phẩm.",
                    "Chưa kiểm tra được tương thích lúc này. KHÔNG tự khẳng định là tương thích.");
        } catch (Exception e) {
            LOG.warnf("checkCompatibility(%s) failed: %s", skus, e.getMessage());
            result = "Chưa kiểm tra được tương thích lúc này. KHÔNG tự khẳng định là tương thích.";
        }
        tracker.tool(sessionId, "checkCompatibility", String.valueOf(skus), result);
        return result;
    }

    /**
     * Tìm sản phẩm đang bán theo danh mục / khoảng giá / từ khóa, kèm giá hiện tại. Dùng khi khách hỏi theo
     * ngân sách ("card tầm 15 triệu"), vì kho tri thức không chứa giá.
     */
    @Tool("Tìm sản phẩm đang bán theo danh mục, khoảng giá (VND) và từ khóa. Trả về mã SKU, tên và giá hiện tại. "
            + "Danh mục: CPU, MAINBOARD, RAM, GPU, STORAGE, PSU, CASE, COOLER")
    public String findProducts(@ToolMemoryId String sessionId,
                               @P(value = "Mã danh mục, vd GPU", required = false) String category,
                               @P(value = "Giá thấp nhất, đơn vị đồng. Bỏ trống trừ khi khách nói rõ giá tối thiểu",
                                       required = false) Long minPrice,
                               @P(value = "Giá cao nhất, đơn vị đồng. Chỉ đặt khi khách nêu ngân sách; khách nói "
                                       + "'tầm X' thì đặt khoảng X cộng 10%. KHÔNG tự đoán giá", required = false) Long maxPrice,
                               @P(value = "Từ khóa model khách nhắc tới, vd 4070 hoặc DDR5. Bỏ trống nếu khách chỉ "
                                       + "nêu nhu cầu", required = false) String keyword) {
        tracker.progress(sessionId, "Đang tìm sản phẩm phù hợp");
        String cat = blank(category) ? null : category.trim().toUpperCase(Locale.ROOT);
        BigDecimal min = minPrice == null || minPrice <= 0 ? null : BigDecimal.valueOf(minPrice);
        BigDecimal max = maxPrice == null || maxPrice <= 0 ? null : BigDecimal.valueOf(maxPrice);
        String result;
        try {
            String note = "";
            List<ProductView> found = List.of();
            if (!blank(keyword)) {
                List<ProductView> matched = byKeyword(keyword.trim(), cat);
                found = matched.stream().filter(p -> inRange(p, min, max)).limit(MAX_FOUND).toList();
                if (found.isEmpty() && !matched.isEmpty()) {
                    // Sản phẩm khách hỏi có bán nhưng ngoài khoảng giá (thường do model tự đoán giá): vẫn trả về
                    found = matched.stream().limit(MAX_FOUND).toList();
                    note = " (không có sản phẩm trong khoảng giá đã hỏi; đây là sản phẩm khớp từ khóa với giá thật)";
                }
            }
            if (found.isEmpty()) {
                // Không có từ khóa, hoặc từ khóa không khớp: lọc theo danh mục + giá, sát trần ngân sách nhất trước
                found = catalog.filter(cat, min, max, max != null ? "price,desc" : "sold,desc", 0, MAX_FOUND)
                        .data().content();
            }
            List<String> lines = found.stream()
                    .map(p -> "- " + p.sku() + " | " + p.name() + " | " + vnd(p.price())
                            + (blank(p.shortDescription()) ? "" : " | " + p.shortDescription()))
                    .toList();
            result = lines.isEmpty()
                    ? "Không có sản phẩm đang bán nào khớp điều kiện. KHÔNG gợi ý mã SKU nào khác."
                    : "Sản phẩm đang bán" + note + ":\n" + String.join("\n", lines);
        } catch (Exception e) {
            LOG.warnf("findProducts(%s, %s, %s, %s) failed: %s", cat, min, max, keyword, e.getMessage());
            result = "Không tìm được sản phẩm lúc này.";
        }
        tracker.tool(sessionId, "findProducts",
                "category=" + cat + ", minPrice=" + min + ", maxPrice=" + max + ", keyword=" + keyword, result);
        return result;
    }

    /** Full-text của catalog không lọc giá được: lấy rộng rồi lọc giá ở bên gọi. */
    private List<ProductView> byKeyword(String keyword, String cat) {
        return catalog.search(keyword, 0, 50).data().content().stream()
                .filter(p -> cat == null || cat.equals(p.categoryCode()))
                .toList();
    }

    private static boolean inRange(ProductView p, BigDecimal min, BigDecimal max) {
        return (min == null || (p.price() != null && p.price().compareTo(min) >= 0))
                && (max == null || (p.price() != null && p.price().compareTo(max) <= 0));
    }

    static String describe(CompatibilityResult r) {
        StringBuilder sb = new StringBuilder(r.compatible()
                ? "Kết quả rule engine: các linh kiện TƯƠNG THÍCH."
                : "Kết quả rule engine: KHÔNG TƯƠNG THÍCH.");
        List<CompatibilityIssue> issues = r.issues() == null ? List.of() : r.issues();
        String errors = issues.stream().filter(i -> i.severity() == ERROR)
                .map(i -> "- " + i.message()).collect(Collectors.joining("\n"));
        String warnings = issues.stream().filter(i -> i.severity() != ERROR)
                .map(i -> "- " + i.message()).collect(Collectors.joining("\n"));
        if (!errors.isEmpty()) {
            sb.append("\nLỗi:\n").append(errors);
        }
        if (!warnings.isEmpty()) {
            sb.append("\nCảnh báo:\n").append(warnings);
        }
        if (r.requiredWattage() > 0) {
            sb.append("\nTổng TDP ước tính ").append(r.estimatedWattage())
                    .append("W, nguồn nên từ ").append(r.requiredWattage()).append("W.");
        }
        return sb.toString();
    }

    private static String notFoundOr(WebApplicationException e, String notFound, String otherwise) {
        int status = e.getResponse() == null ? 0 : e.getResponse().getStatus();
        if (status != 404) {
            LOG.warnf("Gọi service khác lỗi HTTP %d: %s", status, e.getMessage());
        }
        return status == 404 ? notFound : otherwise;
    }

    private static boolean blank(String s) {
        return s == null || s.isBlank();
    }

    private static String vnd(BigDecimal amount) {
        return amount == null ? "chưa có giá" : NumberFormat.getInstance(Locale.of("vi", "VN")).format(amount) + " đ";
    }
}
