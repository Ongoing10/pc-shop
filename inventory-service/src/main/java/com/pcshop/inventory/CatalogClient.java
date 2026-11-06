package com.pcshop.inventory;

import com.pcshop.contracts.ResponseData;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;

import java.util.List;

/** Gọi API nội bộ của catalog-service (địa chỉ ở quarkus.rest-client.catalog.url). */
@RegisterRestClient(configKey = "catalog")
@Path("/api/v1/products")
public interface CatalogClient {

    /** Tối đa 100 SKU mỗi lần; bên gọi tự chia lô. */
    int BATCH_SIZE = 100;

    record BatchRequest(List<String> skus) {
    }

    record ProductSummary(String productId, String sku, String name, Integer status) {
    }

    /** Sản phẩm đã công bố (bỏ DRAFT); SKU không có trong kết quả là không tồn tại hoặc chưa công bố. */
    @POST
    @Path("/batch")
    ResponseData<List<ProductSummary>> batch(BatchRequest request);
}
