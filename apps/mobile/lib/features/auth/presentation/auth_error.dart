import 'package:dio/dio.dart';
import 'package:xenior_mobile/core/errors/app_exception.dart';

String authErrorMessage(Object error) {
  if (error is DioException && error.error is AppException) {
    return (error.error! as AppException).message;
  }
  if (error is AppException) {
    return error.message;
  }
  return 'İşlem tamamlanamadı. Lütfen tekrar deneyin.';
}
