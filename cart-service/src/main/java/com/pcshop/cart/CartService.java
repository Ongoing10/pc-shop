package com.pcshop.cart;

import com.pcshop.common.webflux.security.CurrentUser;
import com.pcshop.contracts.BulkErrors;
import com.pcshop.contracts.BusinessException;
import com.pcshop.contracts.ErrorCode;
import org.springframework.data.redis.core.ReactiveHashOperations;
import org.springframework.data.redis.core.ReactiveStringRedisTemplate;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.regex.Pattern;

/**
 * Giỏ hàng trong Redis, mỗi giỏ là một Hash (sku → số lượng):
 * <ul>
 *   <li>đã đăng nhập: key cart:{userId}, không hết hạn</li>
 *   <li>khách vãng lai: key cart:guest:{guestKey} (client tự sinh và gửi qua header X-Guest-Key), TTL 30 ngày</li>
 * </ul>
 * Giá và tồn kho KHÔNG lưu trong giỏ, luôn lấy mới từ catalog/inventory khi xem giỏ.
 */
@Service
public class CartService {

    public static final int MAX_QUANTITY_PER_ITEM = 99;
    /** Số SKU khác nhau tối đa trong một giỏ (≤ 100 để xem giỏ chỉ cần một lần gọi batch của catalog/inventory). */
    public static final int MAX_ITEMS = 50;
    private static final Duration GUEST_TTL = Duration.ofDays(30);
    private static final Pattern GUEST_KEY = Pattern.compile("^[A-Za-z0-9-]{16,64}$");
    private static final int ACTIVE = 2;

    public record CartLine(String sku, int quantity, String productId, String name, String slug, String imageUrl,
                           String categoryCode, BigDecimal unitPrice, BigDecimal lineTotal, Integer available,
                           boolean purchasable, String message, Integer warrantyMonths) {
    }

    public record CartView(List<CartLine> items, int totalQuantity, BigDecimal subtotal, List<String> warnings) {
    }

    /** Giỏ đang thao tác: key Redis và có phải giỏ khách vãng lai không. */
    public record CartKey(String key, boolean guest) {
    }

    private final ReactiveStringRedisTemplate redis;
    private final ProductLookupClient lookup;

    public CartService(ReactiveStringRedisTemplate redis, ProductLookupClient lookup) {
        this.redis = redis;
        this.lookup = lookup;
    }

    /** Đã đăng nhập thì dùng giỏ tài khoản (bỏ qua X-Guest-Key); chưa đăng nhập thì bắt buộc có X-Guest-Key. */
    public Mono<CartKey> resolve(String guestKey) {
        return CurrentUser.get()
                .map(user -> new CartKey(userKey(user.id().toString()), false))
                .switchIfEmpty(Mono.defer(() -> Mono.just(new CartKey(guestKey(guestKey), true))));
    }

    public Mono<Map<String, Integer>> items(CartKey cart) {
        return hash().entries(cart.key())
                .collectMap(Map.Entry::getKey, e -> Integer.parseInt(e.getValue()), LinkedHashMap::new);
    }

    /**
     * Cộng dồn số lượng bằng HINCRBY (nguyên tử: hai request cùng lúc không đè nhau); vượt 99 thì trừ lại
     * và báo lỗi. SKU chưa có trong giỏ phải là sản phẩm đang bán và giỏ chưa đủ {@link #MAX_ITEMS} món.
     */
    public Mono<Integer> add(CartKey cart, String sku, int quantity) {
        return checkNewSku(cart, sku)
                .then(hash().increment(cart.key(), sku, quantity))
                .flatMap(total -> total > MAX_QUANTITY_PER_ITEM
                        ? hash().increment(cart.key(), sku, -quantity).then(Mono.<Long>error(new BusinessException(
                                ErrorCode.BAD_REQUEST, "Mỗi sản phẩm tối đa " + MAX_QUANTITY_PER_ITEM + " chiếc")))
                        : Mono.just(total))
                .flatMap(total -> touch(cart).thenReturn(total.intValue()));
    }

    /**
     * Thêm nhiều món một lần (vd đưa cả cấu hình PC vào giỏ), cộng dồn như {@link #add}.
     * Một món vượt giới hạn hoặc không còn bán thì không thêm gì; ghi bằng một lệnh HSET nhiều field.
     */
    public Mono<Void> addAll(CartKey cart, Map<String, Integer> lines) {
        BulkErrors errors = BulkErrors.check(lines.keySet());
        return items(cart).flatMap(current -> {
            Map<String, String> next = new LinkedHashMap<>();
            lines.forEach((sku, quantity) -> {
                int total = current.getOrDefault(sku, 0) + quantity;
                if (total > MAX_QUANTITY_PER_ITEM) {
                    errors.add(sku, "Mỗi sản phẩm tối đa " + MAX_QUANTITY_PER_ITEM + " chiếc (giỏ đang có "
                            + current.getOrDefault(sku, 0) + ")");
                }
                next.put(sku, String.valueOf(total));
            });
            errors.throwIfAny();
            List<String> newSkus = lines.keySet().stream().filter(sku -> !current.containsKey(sku)).toList();
            return checkNewSkus(current.size(), newSkus)
                    .then(hash().putAll(cart.key(), next))
                    .then(touch(cart));
        }).then();
    }

    /** Đặt số lượng tuyệt đối; 0 = xóa dòng. SKU mới được kiểm tra như {@link #add}. */
    public Mono<Void> set(CartKey cart, String sku, int quantity) {
        Mono<?> op = quantity == 0
                ? hash().remove(cart.key(), sku)
                : checkNewSku(cart, sku).then(hash().put(cart.key(), sku, String.valueOf(quantity)));
        return op.then(touch(cart)).then();
    }

    public Mono<Void> remove(CartKey cart, String sku) {
        return hash().remove(cart.key(), sku).then();
    }

    public Mono<Void> clear(CartKey cart) {
        return redis.delete(cart.key()).then();
    }

    /**
     * Gộp giỏ guest vào giỏ tài khoản (cộng dồn số lượng, tối đa 99/sản phẩm) rồi xóa giỏ guest.
     * Giỏ tài khoản đã đủ {@link #MAX_ITEMS} món thì bỏ qua các SKU mới của giỏ guest.
     */
    public Mono<Void> merge(String userId, String guestKey) {
        String from = guestKey(guestKey);
        String to = userKey(userId);
        CartKey target = new CartKey(to, false);
        return Mono.zip(items(new CartKey(from, true)), items(target)).flatMap(t -> {
            Map<String, Integer> merged = new LinkedHashMap<>(t.getT2());
            t.getT1().forEach((sku, quantity) -> {
                if (merged.containsKey(sku) || merged.size() < MAX_ITEMS) {
                    merged.merge(sku, quantity, (a, b) -> Math.min(a + b, MAX_QUANTITY_PER_ITEM));
                }
            });
            Map<String, String> values = new LinkedHashMap<>();
            merged.forEach((sku, quantity) -> values.put(sku, String.valueOf(quantity)));
            return values.isEmpty() ? Mono.just(true) : hash().putAll(to, values);
        }).then(redis.delete(from)).then();
    }

    /**
     * Giỏ kèm tên, giá hiện tại, tồn kho và tạm tính. catalog/inventory không phản hồi thì vẫn trả giỏ
     * (thiếu giá/tồn kho) kèm cảnh báo, để người dùng không mất giỏ chỉ vì một service đang tắt.
     */
    public Mono<CartView> view(CartKey cart) {
        return items(cart).flatMap(items -> {
            if (items.isEmpty()) {
                return Mono.just(new CartView(List.of(), 0, BigDecimal.ZERO, List.of()));
            }
            // hai lời gọi chạy song song, có thể ghi cảnh báo từ hai thread
            List<String> warnings = new CopyOnWriteArrayList<>();
            Mono<Map<String, ProductLookupClient.ProductInfo>> products = lookup.products(items.keySet())
                    .onErrorResume(e -> {
                        warnings.add("Không lấy được thông tin sản phẩm, giá chưa được cập nhật");
                        return Mono.just(Map.of());
                    });
            Mono<Map<String, ProductLookupClient.StockInfo>> stocks = lookup.stocks(items.keySet())
                    .onErrorResume(e -> {
                        warnings.add("Không kiểm tra được tồn kho");
                        return Mono.just(Map.of());
                    });
            return Mono.zip(products, stocks).map(t -> build(items, t.getT1(), t.getT2(), warnings));
        });
    }

    // ------------------------------------------------------------------

    private static CartView build(Map<String, Integer> items, Map<String, ProductLookupClient.ProductInfo> products,
                                  Map<String, ProductLookupClient.StockInfo> stocks, List<String> warnings) {
        List<CartLine> lines = new ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO;
        int totalQuantity = 0;
        boolean stockKnown = !stocks.isEmpty();
        for (Map.Entry<String, Integer> e : items.entrySet()) {
            String sku = e.getKey();
            int qty = e.getValue();
            ProductLookupClient.ProductInfo p = products.get(sku);
            ProductLookupClient.StockInfo s = stocks.get(sku);
            Integer available = s == null ? null : s.available();

            String message = null;
            boolean purchasable = true;
            if (p == null) {
                purchasable = false;
                message = products.isEmpty() ? null : "Sản phẩm không còn tồn tại";
            } else if (p.status() == null || p.status() != ACTIVE) {
                purchasable = false;
                message = "Sản phẩm đã ngừng bán";
            } else if (stockKnown && (available == null || available <= 0)) {
                purchasable = false;
                message = "Hết hàng";
            } else if (stockKnown && available < qty) {
                purchasable = false;
                message = "Chỉ còn " + available + " sản phẩm";
            }

            BigDecimal unitPrice = p == null ? null : p.price();
            BigDecimal lineTotal = unitPrice == null ? null : unitPrice.multiply(BigDecimal.valueOf(qty));
            if (purchasable && lineTotal != null) {
                subtotal = subtotal.add(lineTotal);
            }
            totalQuantity += qty;
            lines.add(new CartLine(sku, qty, p == null ? null : p.productId(), p == null ? null : p.name(),
                    p == null ? null : p.slug(), p == null ? null : p.imageUrl(),
                    p == null ? null : p.categoryCode(), unitPrice, lineTotal, available, purchasable, message,
                    p == null ? null : p.warrantyMonths()));
        }
        if (lines.stream().anyMatch(l -> !l.purchasable() && l.message() != null)) {
            warnings.add("Một số sản phẩm trong giỏ không thể đặt mua, tạm tính chưa bao gồm các sản phẩm này");
        }
        return new CartView(lines, totalQuantity, subtotal, List.copyOf(warnings));
    }

    /** SKU chưa có trong giỏ thì kiểm tra như {@link #checkNewSkus}; đã có thì bỏ qua. */
    private Mono<Void> checkNewSku(CartKey cart, String sku) {
        return hash().hasKey(cart.key(), sku).flatMap(exists -> exists
                ? Mono.<Void>empty()
                : hash().size(cart.key()).flatMap(size -> checkNewSkus(size.intValue(), List.of(sku))));
    }

    /**
     * Kiểm tra trước khi đưa SKU mới vào giỏ: số món không vượt {@link #MAX_ITEMS}, sản phẩm tồn tại và đang bán.
     * Một SKU lỗi → 400 với lý do; nhiều SKU → 400 kèm danh sách [{id, reason}] như API hàng loạt.
     */
    private Mono<Void> checkNewSkus(int currentItems, List<String> newSkus) {
        if (newSkus.isEmpty()) {
            return Mono.empty();
        }
        if (currentItems + newSkus.size() > MAX_ITEMS) {
            return Mono.error(new BusinessException(ErrorCode.BAD_REQUEST,
                    "Giỏ hàng tối đa " + MAX_ITEMS + " sản phẩm khác nhau"));
        }
        return lookup.products(newSkus)
                .onErrorMap(e -> !(e instanceof BusinessException), e -> new BusinessException(
                        ErrorCode.EXTERNAL_SERVICE_ERROR, "Không kiểm tra được sản phẩm, thử lại sau"))
                .flatMap(products -> {
                    BulkErrors errors = new BulkErrors();
                    for (String sku : newSkus) {
                        ProductLookupClient.ProductInfo p = products.get(sku);
                        String reason = p == null ? "Sản phẩm không tồn tại"
                                : p.status() == null || p.status() != ACTIVE ? "Sản phẩm đã ngừng bán" : null;
                        if (reason != null && newSkus.size() == 1) {
                            return Mono.error(new BusinessException(ErrorCode.BAD_REQUEST, reason + ": " + sku));
                        }
                        if (reason != null) {
                            errors.add(sku, reason);
                        }
                    }
                    errors.throwIfAny();
                    return Mono.<Void>empty();
                });
    }

    private Mono<Boolean> touch(CartKey cart) {
        return cart.guest() ? redis.expire(cart.key(), GUEST_TTL) : Mono.just(true);
    }

    private ReactiveHashOperations<String, String, String> hash() {
        return redis.opsForHash();
    }

    private static String userKey(String userId) {
        return "cart:" + userId;
    }

    private static String guestKey(String guestKey) {
        if (guestKey == null || !GUEST_KEY.matcher(guestKey).matches()) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED,
                    "Cần đăng nhập hoặc gửi header X-Guest-Key (16-64 ký tự A-Z, a-z, 0-9, -)");
        }
        return "cart:guest:" + guestKey;
    }
}
