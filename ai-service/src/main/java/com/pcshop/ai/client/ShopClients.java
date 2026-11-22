package com.pcshop.ai.client;

import com.pcshop.contracts.PageResponse;
import com.pcshop.contracts.ResponseData;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.QueryParam;
import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/** REST client gọi sang service khác để lấy dữ liệu THỜI GIAN THỰC cho tool calling. */
public final class ShopClients {

    private ShopClients() {
    }

    public record ProductView(String sku, String name, String categoryCode, String brandCode,
                              String shortDescription, String description, BigDecimal price, Integer status,
                              Map<String, Object> specs, Map<String, Object> compat, List<String> tags,
                              Integer warrantyMonths) {
    }

    public record StockView(String sku, int available, boolean inStock) {
    }

    public record CompatibilityRequest(List<String> skus) {
    }

    public record CompatibilityIssue(String ruleCode, int severity, String message) {
    }

    public record CompatibilityResult(boolean compatible, List<CompatibilityIssue> issues, int estimatedWattage,
                                      int requiredWattage) {
    }

    /** API công khai của catalog: chỉ trả sản phẩm ACTIVE. */
    @RegisterRestClient(configKey = "catalog")
    @Path("/api/v1/products")
    public interface CatalogClient {

        @GET
        ResponseData<PageResponse<ProductView>> page(@QueryParam("page") int page, @QueryParam("size") int size);

        @GET
        ResponseData<PageResponse<ProductView>> filter(@QueryParam("category") String category,
                                                       @QueryParam("minPrice") BigDecimal minPrice,
                                                       @QueryParam("maxPrice") BigDecimal maxPrice,
                                                       @QueryParam("sort") String sort,
                                                       @QueryParam("page") int page,
                                                       @QueryParam("size") int size);

        @GET
        @Path("/search")
        ResponseData<PageResponse<ProductView>> search(@QueryParam("q") String q, @QueryParam("page") int page,
                                                       @QueryParam("size") int size);

        @GET
        @Path("/{sku}")
        ResponseData<ProductView> bySku(@PathParam("sku") String sku);
    }

    /** Rule engine tương thích tất định của catalog (compatibility_rules). */
    @RegisterRestClient(configKey = "catalog")
    @Path("/api/v1/compatibility")
    public interface CompatibilityClient {

        @POST
        @Path("/check")
        ResponseData<CompatibilityResult> check(CompatibilityRequest request);
    }

    @RegisterRestClient(configKey = "inventory")
    @Path("/api/v1/inventory")
    public interface InventoryClient {

        @GET
        @Path("/{sku}")
        ResponseData<StockView> stock(@PathParam("sku") String sku);
    }
}
