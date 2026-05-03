from rest_framework import status
from rest_framework.exceptions import ErrorDetail
from rest_framework.views import exception_handler


TRANSLATIONS = {
    "Authentication credentials were not provided.": "Bạn chưa đăng nhập.",
    "You do not have permission to perform this action.": "Bạn không có quyền thực hiện thao tác này.",
    "Not found.": "Không tìm thấy dữ liệu.",
    "No active account found with the given credentials": "Tên đăng nhập hoặc mật khẩu không chính xác.",
    "Given token not valid for any token type": "Mã xác thực không hợp lệ.",
    "Token is invalid or expired": "Mã xác thực không hợp lệ hoặc đã hết hạn.",
    "Token is invalid": "Mã xác thực không hợp lệ.",
    "Token is blacklisted": "Mã xác thực đã bị vô hiệu hóa.",
    "Token has wrong type": "Loại mã xác thực không đúng.",
    "Token has expired": "Mã xác thực đã hết hạn.",
    "Authorization header must contain two space-delimited values": "Tiêu đề Authorization phải có dạng: Bearer <mã_xác_thực>.",
    "Invalid token header. No credentials provided.": "Không tìm thấy mã xác thực.",
    "Invalid token header. Token string should not contain spaces.": "Mã xác thực không đúng định dạng.",
    "This field is required.": "Trường này là bắt buộc.",
    "This field may not be blank.": "Trường này không được để trống.",
}


def _translate_value(value):
    if isinstance(value, list):
        return [_translate_value(item) for item in value]
    if isinstance(value, dict):
        return {key: _translate_value(item) for key, item in value.items()}
    if isinstance(value, ErrorDetail):
        text = str(value)
        return TRANSLATIONS.get(text, text)
    if isinstance(value, str):
        return TRANSLATIONS.get(value, value)
    return value


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        return response

    response.data = _translate_value(response.data)

    if isinstance(response.data, dict):
        detail = response.data.get("detail")
        code = response.data.get("code")
        if code == "token_not_valid" and detail in {"Mã xác thực không hợp lệ.", "Mã xác thực không hợp lệ hoặc đã hết hạn."}:
            response.data["detail"] = "Mã xác thực không hợp lệ hoặc đã hết hạn."
            response.data.pop("messages", None)

    if response.status_code == status.HTTP_401_UNAUTHORIZED and "detail" not in response.data:
        response.data = {"detail": "Bạn chưa đăng nhập hoặc mã xác thực không hợp lệ."}

    if response.status_code == status.HTTP_403_FORBIDDEN and "detail" not in response.data:
        response.data = {"detail": "Bạn không có quyền thực hiện thao tác này."}

    if response.status_code == status.HTTP_404_NOT_FOUND and "detail" not in response.data:
        response.data = {"detail": "Không tìm thấy dữ liệu."}

    return response
