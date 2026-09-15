import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

abstract interface class TenantStorage {
  Future<String?> readSelectedBusinessId();
  Future<void> writeSelectedBusinessId(String businessId);
  Future<void> clearSelectedBusinessId();
}

class SecureTenantStorage implements TenantStorage {
  SecureTenantStorage(this._storage);

  static const _selectedBusinessKey = 'tenant.selected_business_id';
  final FlutterSecureStorage _storage;

  @override
  Future<String?> readSelectedBusinessId() =>
      _storage.read(key: _selectedBusinessKey);

  @override
  Future<void> writeSelectedBusinessId(String businessId) =>
      _storage.write(key: _selectedBusinessKey, value: businessId);

  @override
  Future<void> clearSelectedBusinessId() =>
      _storage.delete(key: _selectedBusinessKey);
}

final tenantStorageProvider = Provider<TenantStorage>(
  (ref) => SecureTenantStorage(const FlutterSecureStorage()),
);
