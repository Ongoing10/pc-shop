package com.pcshop.excel.engine;

/**
 * Lỗi của cả file (không phải xlsx, quá lớn, sai mẫu, quá số dòng): từ chối cả file.
 * Message viết sẵn tiếng Việt; service đổi sang {@code BusinessException(BAD_REQUEST, message)}.
 * Lỗi từng dòng KHÔNG ném exception mà ghi vào dòng ({@code BaseImportDTO.addError}).
 */
public class ExcelFileException extends RuntimeException {

    public ExcelFileException(String message) {
        super(message);
    }

    public ExcelFileException(String message, Throwable cause) {
        super(message, cause);
    }
}
