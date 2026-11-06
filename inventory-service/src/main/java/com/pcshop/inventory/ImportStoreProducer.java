package com.pcshop.inventory;

import com.pcshop.excel.store.ImportStore;
import com.pcshop.excel.store.TempDirImportStore;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Produces;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.nio.file.Path;
import java.time.Duration;

/** Nơi giữ file Excel giữa bước validate và import: thư mục tạm trên máy (service chạy 1 instance). */
public class ImportStoreProducer {

    @Produces
    @ApplicationScoped
    ImportStore importStore(@ConfigProperty(name = "pcshop.import.dir") Path dir,
                            @ConfigProperty(name = "pcshop.import.ttl", defaultValue = "PT1H") Duration ttl) {
        return new TempDirImportStore(dir, ttl);
    }
}
