package com.pcshop.excel.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.ArrayList;
import java.util.List;

/**
 * Lớp cha của DTO import. Các field ở đây không phải cột Excel.
 * {@code row} là chỉ số dòng trong sheet tính từ 0 (dòng tiêu đề là 0), giống bản MVC.
 */
public abstract class BaseImportDTO {

    @JsonProperty("is_valid")
    private boolean isValid = true;

    private int row;

    @JsonProperty("error_message")
    private String errorMessage;

    @JsonIgnore
    private final List<String> errors = new ArrayList<>();

    public boolean getIsValid() {
        return isValid;
    }

    public void setIsValid(boolean isValid) {
        this.isValid = isValid;
    }

    public int getRow() {
        return row;
    }

    public void setRow(int row) {
        this.row = row;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
    }

    /** Các lỗi của dòng theo thứ tự thêm ({@code errorMessage} là các lỗi này nối bằng xuống dòng). */
    @JsonIgnore
    public List<String> getErrors() {
        return List.copyOf(errors);
    }

    /** Thêm một lỗi (xuống dòng giữa các lỗi) và đánh dấu dòng không hợp lệ. */
    public void addError(String message) {
        if (message == null || message.isBlank()) {
            return;
        }
        this.isValid = false;
        this.errors.add(message);
        this.errorMessage = errorMessage == null || errorMessage.isBlank()
                ? message
                : errorMessage + "\n" + message;
    }
}
