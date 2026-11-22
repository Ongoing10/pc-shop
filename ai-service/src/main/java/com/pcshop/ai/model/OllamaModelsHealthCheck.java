// Cũ: chỉ dùng khi chạy Ollama. Đang dùng Gemini nên comment cả file; quay lại Ollama thì bỏ comment (xem application.properties).
// package com.pcshop.ai.model;
//
// import jakarta.enterprise.context.ApplicationScoped;
// import jakarta.inject.Inject;
// import org.eclipse.microprofile.health.HealthCheck;
// import org.eclipse.microprofile.health.HealthCheckResponse;
// import org.eclipse.microprofile.health.HealthCheckResponseBuilder;
// import org.eclipse.microprofile.health.Readiness;
//
// /** /q/health/ready: model Ollama đã sẵn sàng chưa (đang tải thì kèm % tiến độ). */
// @Readiness
// @ApplicationScoped
// public class OllamaModelsHealthCheck implements HealthCheck {
//
//     @Inject
//     OllamaModels models;
//
//     @Override
//     public HealthCheckResponse call() {
//         OllamaModels.Status s = models.status();
//         HealthCheckResponseBuilder builder = HealthCheckResponse.named("ollama-models")
//                 .status(s.state() == OllamaModels.State.READY || s.state() == OllamaModels.State.DISABLED)
//                 .withData("state", s.state().name());
//         if (s.model() != null) {
//             builder.withData("model", s.model());
//         }
//         if (s.percent() != null) {
//             builder.withData("percent", s.percent());
//         }
//         if (s.error() != null) {
//             builder.withData("error", s.error());
//         }
//         return builder.build();
//     }
// }
