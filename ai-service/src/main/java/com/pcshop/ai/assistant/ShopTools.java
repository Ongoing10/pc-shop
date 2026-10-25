package com.pcshop.ai.assistant;

import com.pcshop.ai.client.ShopClients.CatalogClient;
import com.pcshop.ai.client.ShopClients.InventoryClient;
import com.pcshop.ai.client.ShopClients.ProductView;
import com.pcshop.ai.client.ShopClients.StockView;
import dev.langchain4j.agent.tool.P;
import dev.langchain4j.agent.tool.Tool;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.jboss.logging.Logger;

import java.text.NumberFormat;
import java.util.List;
import java.util.Locale;

/**
 * Tool cho LLM gọi (tool calling). GIÁ và TỒN KHO luôn lấy realtime từ service khác,
 * KHÔNG lấy từ vector store, để LLM không "bịa" giá (plan mục 5.2).
 * Tool trả về chuỗi ngắn gọn, dễ cho LLM đọc; lỗi thì trả lời rõ là không lấy được, không ném exception.
 */
@ApplicationScoped
public class ShopTools {

    private static final Logger LOG = Logger.getLogger(ShopTools.class);
    private static final int ACTIVE = 2;

    @Inject
    @RestClient
    CatalogClient catalog;

    @Inject
    @RestClient
    InventoryClient inventory;

    @Tool("Lấy giá bán hiện tại của một sản phẩm theo mã SKU")
    public String getPrice(@P("Mã SKU, ví dụ GPU-MSI-4070S-12G") String sku) {
        try {
            ProductView p = catalog.bySku(sku).data();
            if (p == null || p.status() == null || p.status() != ACTIVE) {
                return "Sản phẩm " + sku + " hiện không còn bán.";
            }
            return p.name() + " (" + sku + ") giá " + vnd(p.price());
        } catch (Exception e) {
            LOG.warnf("getPrice(%s) failed: %s", sku, e.getMessage());
            return "Không lấy được giá của " + sku + " lúc này.";
        }
    }

    @Tool("Kiểm tra sản phẩm còn hàng không và còn bao nhiêu, theo mã SKU")
    public String checkStock(@P("Mã SKU") String sku) {
        try {
            StockView s = inventory.stock(sku).data();
            return s.inStock() ? sku + " còn " + s.available() + " sản phẩm." : sku + " hiện đã hết hàng.";
        } catch (Exception e) {
            LOG.warnf("checkStock(%s) failed: %s", sku, e.getMessage());
            return "Không kiểm tra được tồn kho của " + sku + " lúc này.";
        }
    }

    /**
     * KHUNG: kiểm tra tương thích phải do RULE ENGINE TẤT ĐỊNH ở catalog-service làm (compatibility_rules),
     * LLM chỉ diễn giải kết quả. TODO: gọi API /api/v1/compatibility/check của catalog khi đã có.
     */
    @Tool("Kiểm tra các linh kiện có lắp được với nhau không, truyền danh sách mã SKU")
    public String checkCompatibility(@P("Danh sách mã SKU của cấu hình") List<String> skus) {
        return "Chức năng kiểm tra tương thích chưa sẵn sàng. Hãy nói với khách là sẽ kiểm tra lại cấu hình "
                + skus + " sau, không tự khẳng định là tương thích.";
    }

    private static String vnd(java.math.BigDecimal amount) {
        return amount == null ? "chưa có giá" : NumberFormat.getInstance(Locale.of("vi", "VN")).format(amount) + " đ";
    }
}
