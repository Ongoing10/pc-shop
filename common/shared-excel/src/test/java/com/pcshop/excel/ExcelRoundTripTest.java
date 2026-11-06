package com.pcshop.excel;

import com.pcshop.excel.annotation.ExcelEnum;
import com.pcshop.excel.annotation.ImportExportMapping;
import com.pcshop.excel.dto.BaseImportDTO;
import com.pcshop.excel.engine.ExcelReader;
import com.pcshop.excel.engine.ExcelWriter;
import com.pcshop.excel.reference.ReferenceItem;
import com.pcshop.excel.store.TempDirImportStore;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.ByteArrayInputStream;
import java.nio.file.Path;
import java.time.Duration;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Chuyển từ ExcelRoundTripTest của common-reactive (bỏ Lombok), thêm test cho header() và ImportStore.
 */
class ExcelRoundTripTest {

    enum Gender implements ExcelEnum {
        MALE("gender.male"), FEMALE("gender.female");

        private final String text;

        Gender(String text) {
            this.text = text;
        }

        @Override
        public String getText() {
            return text;
        }
    }

    public static class UserImportDTO extends BaseImportDTO {
        @ImportExportMapping(isCodeField = true, isTextColumn = true)
        private String code;
        private String fullName;
        private Integer age;
        private LocalDate birthday;
        private Gender gender;
        @ImportExportMapping(key = "Department")
        private String department;

        public UserImportDTO() {
        }

        public String getCode() { return code; }
        public void setCode(String code) { this.code = code; }
        public String getFullName() { return fullName; }
        public void setFullName(String fullName) { this.fullName = fullName; }
        public Integer getAge() { return age; }
        public void setAge(Integer age) { this.age = age; }
        public LocalDate getBirthday() { return birthday; }
        public void setBirthday(LocalDate birthday) { this.birthday = birthday; }
        public Gender getGender() { return gender; }
        public void setGender(Gender gender) { this.gender = gender; }
        public String getDepartment() { return department; }
        public void setDepartment(String department) { this.department = department; }
    }

    public static class TextDTO extends BaseImportDTO {
        private String value;

        public TextDTO() {
        }

        TextDTO(String value) {
            this.value = value;
        }

        public String getValue() { return value; }
    }

    public static class NumberDTO extends BaseImportDTO {
        private Integer value;

        public NumberDTO() {
        }

        public Integer getValue() { return value; }
    }

    public static class StockLineDTO extends BaseImportDTO {
        @ImportExportMapping(header = "Mã SKU", required = true, isTextColumn = true, isCodeField = true)
        private String sku;
        @ImportExportMapping(header = "Số lượng nhập", required = true)
        private Integer quantity;

        public StockLineDTO() {
        }

        public String getSku() { return sku; }
        public Integer getQuantity() { return quantity; }
    }

    private final Function<String, String> translate = code -> switch (code) {
        case "gender.male" -> "Nam";
        case "gender.female" -> "Nữ";
        case "user.fullName" -> "Họ tên";
        default -> code;
    };

    @Test
    void writeThenReadKeepsValues() throws Exception {
        UserImportDTO a = new UserImportDTO();
        a.setCode("001");
        a.setFullName("Nguyễn Văn A");
        a.setAge(30);
        a.setBirthday(LocalDate.of(1996, 5, 1));
        a.setGender(Gender.FEMALE);
        a.setDepartment("D01");

        UserImportDTO b = new UserImportDTO();
        b.setCode("001"); // trùng mã trong file
        b.setFullName("B");

        Map<String, List<ReferenceItem>> refs = Map.of("Department", List.of(new ReferenceItem(7L, "D01", "Phòng 1")));
        byte[] file = ExcelWriter.write(UserImportDTO.class, List.of(a, b), refs, translate, 50);

        List<UserImportDTO> rows = ExcelReader.read(file, UserImportDTO.class, 1, translate);

        assertThat(rows).hasSize(2);
        UserImportDTO first = rows.getFirst();
        assertThat(first.getCode()).isEqualTo("001");
        assertThat(first.getFullName()).isEqualTo("Nguyễn Văn A");
        assertThat(first.getAge()).isEqualTo(30);
        assertThat(first.getBirthday()).isEqualTo(LocalDate.of(1996, 5, 1));
        assertThat(first.getGender()).isEqualTo(Gender.FEMALE);
        assertThat(ReferenceItem.extractCode(first.getDepartment())).isEqualTo("D01");
        assertThat(first.getIsValid()).isTrue();

        assertThat(rows.get(1).getIsValid()).isFalse();
        assertThat(rows.get(1).getErrorMessage()).contains("import.row_is_duplicated");
    }

    @Test
    void invalidNumberIsReportedOnRow() throws Exception {
        byte[] file = ExcelWriter.write(TextDTO.class, List.of(new TextDTO("abc")), Map.of(), translate, 10);
        List<NumberDTO> rows = ExcelReader.read(file, NumberDTO.class, 1, translate);
        assertThat(rows.getFirst().getIsValid()).isFalse();
        assertThat(rows.getFirst().getErrorMessage()).contains("import.number_is_not_valid");
    }

    @Test
    void headerAttributeAndVietnameseMessages() throws Exception {
        byte[] template = ExcelWriter.write(StockLineDTO.class, List.of(), Map.of(), ExcelMessages.VI, 10);
        try (Workbook wb = new XSSFWorkbook(new ByteArrayInputStream(template))) {
            var header = wb.getSheetAt(0).getRow(0);
            assertThat(header.getCell(0).getStringCellValue()).isEqualTo("Mã SKU (*)");
            assertThat(header.getCell(1).getStringCellValue()).isEqualTo("Số lượng nhập (*)");
        }

        byte[] file = ExcelWriter.write(TextDTO.class, List.of(new TextDTO("abc")), Map.of(), ExcelMessages.VI, 10);
        List<NumberDTO> rows = ExcelReader.read(file, NumberDTO.class, 1, ExcelMessages.VI);
        assertThat(rows.getFirst().getErrorMessage()).contains("số không hợp lệ");
    }

    @Test
    void importStoreSavesLoadsAndDeletes(@TempDir Path dir) {
        TempDirImportStore store = new TempDirImportStore(dir, Duration.ofHours(1));
        UUID id = store.save(new byte[]{1, 2, 3});
        assertThat(store.load(id)).hasValueSatisfying(bytes -> assertThat(bytes).containsExactly(new byte[]{1, 2, 3}));
        store.delete(id);
        assertThat(store.load(id)).isEmpty();
        assertThat(store.load(UUID.randomUUID())).isEmpty();
    }
}
