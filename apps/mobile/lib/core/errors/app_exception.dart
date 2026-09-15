class AppException implements Exception {
  const AppException({
    required this.message,
    this.code = 'UNKNOWN_ERROR',
    this.statusCode,
    this.details,
  });

  final String message;
  final String code;
  final int? statusCode;
  final Object? details;

  @override
  String toString() => 'AppException($code): $message';
}
