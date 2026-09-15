import 'package:dio/dio.dart';
import 'package:xenior_mobile/core/tenant/tenant_storage.dart';

class TenantInterceptor extends Interceptor {
  TenantInterceptor(this._storage);

  static const headerName = 'X-Business-Id';
  final TenantStorage _storage;

  @override
  void onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    if (options.path.startsWith('/auth/')) {
      handler.next(options);
      return;
    }

    final businessId = await _storage.readSelectedBusinessId();
    if (businessId != null && businessId.isNotEmpty) {
      options.headers[headerName] = businessId;
    }
    handler.next(options);
  }
}
