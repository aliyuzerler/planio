import 'package:flutter/material.dart';

class FoundationCard extends StatelessWidget {
  const FoundationCard({super.key});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.spa_outlined,
              size: 40,
              color: Theme.of(context).colorScheme.primary,
            ),
            const SizedBox(height: 16),
            Text(
              'Mobile foundation is ready',
              style: Theme.of(context).textTheme.titleLarge,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            const Text(
              'Business features will be introduced in later phases.',
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
