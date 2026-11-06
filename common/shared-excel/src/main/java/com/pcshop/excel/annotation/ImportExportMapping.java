package com.pcshop.excel.annotation;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Cấu hình một cột Excel trên DTO import/export. Thứ tự cột = thứ tự khai báo field.
 * Tên cột lấy từ message {@code <entity>.<field>}, với entity là tên lớp DTO viết thường đã bỏ
 * {@code dto/export/import} (vd {@code UserImportDTO -> user.username}).
 *
 * <p>Thay đổi so với bản MVC:
 * <ul>
 *   <li>Bỏ {@code validateDuplicateMethod}, {@code method}, {@code include}: dữ liệu tra cứu không
 *       còn lấy bằng cách gọi method repository theo tên (reflection trên repository reactive
 *       trả Flux, không dùng được), mà qua {@code ReferenceSource} khai ở service.</li>
 *   <li>{@code enumName} (chuỗi tên lớp) thay bằng {@link #enumClass()}.</li>
 *   <li>Bỏ import master-detail ({@code isDetailItem}, {@code detailClass}, {@code addSheet}).</li>
 * </ul>
 */
@Target(ElementType.FIELD)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface ImportExportMapping {

    /**
     * Tên cột hiển thị, viết thẳng tiếng Việt (vd "Mã SKU"). Để trống thì engine thử dịch mã
     * {@code <entity>.<field>} qua hàm translate, không có thì dùng tên field.
     * (Thêm mới so với bản common-reactive, vì dự án không dùng i18n.)
     */
    String header() default "";

    /** Cột mã định danh: INSERT thì mã không được trùng trong DB, UPDATE thì mã phải có sẵn. */
    boolean isCodeField() default false;

    /** Thêm dấu (*) vào tên cột. Bắt buộc thật sự thì dùng {@code @NotBlank/@NotNull}. */
    boolean required() default false;

    /** Không đưa field này vào Excel. */
    boolean ignore() default false;

    /**
     * Cột tham chiếu dữ liệu khác (vd {@code "Department"}): export có dropdown dạng {@code Mã|Tên},
     * import kiểm tra mã có tồn tại. Nguồn dữ liệu khai ở {@code referenceSources()} của service.
     */
    String key() default "";

    /** Cột tham chiếu nhận nhiều mã, cách nhau dấu phẩy. */
    boolean multiple() default false;

    /** Enum cài {@code ExcelEnum}: export ra chữ đã dịch, có dropdown; import đổi chữ về enum. */
    Class<? extends Enum<?>> enumClass() default NoEnum.class;

    /** Độ rộng cột, đơn vị 1/256 ký tự (mặc định khoảng 15 ký tự). */
    int width() default 3840;

    /** Mã message (hoặc chữ) làm ghi chú trên ô tiêu đề. */
    String comment() default "";

    /** Định dạng cột là Text để Excel không tự đổi (vd mã "001" thành 1). */
    boolean isTextColumn() default false;

    /** Số hiển thị dạng tiền {@code #,##0}. */
    boolean isCurrency() default false;

    /** Enum rỗng làm giá trị mặc định cho {@link #enumClass()}. */
    enum NoEnum {
    }
}
