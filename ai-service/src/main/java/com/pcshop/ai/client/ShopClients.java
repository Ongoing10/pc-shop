package com.pcshop.ai.client;

import com.pcshop.contracts.PageResponse;
import com.pcshop.contracts.ResponseData;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.QueryParam;
import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;

import java.math.BigDecimal;
import java.util.Map;

/** REST client gọi sang service khác để lấy dữ liệu THỜI GIAN THỰC cho tool calling. */
public final class ShopClients {

    private ShopClients() {
    }

    public record ProductView(String sku, String name, String categoryCode, String brandCode,
                              String shortDescription, BigDecimal price, Integer status,
                              Map<String, Object> specs, Map<String, Object> compat) {
    }

    public record StockView(String sku, int available, boolean inStock) {
    }

    @RegisterRestClient(configKey = "catalog")
    @Path("/api/v1/products")
    public interface CatalogClient {

        @GET
        ResponseData<PageResponse<ProductView>> page(@QueryParam("page") int page, @QueryParam("size") int size);

        @GET
        @Path("/{sku}")
        ResponseData<ProductView> bySku(@PathParam("sku") String sku);
    }

    @RegisterRestClient(configKey = "inventory")
    @Path("/api/v1/inventory")
    public interface InventoryClient {

        @GET
        @Path("/{sku}")
        ResponseData<StockView> stock(@PathParam("sku") String sku);
    }
}
