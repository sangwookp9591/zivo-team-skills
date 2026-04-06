# 피처 폴더 구조

신규 피처 생성 시 따라야 할 폴더 구조와 파일 템플릿.

## 폴더 구조

```
feature/{name}/
├── detail/
│   ├── view/
│   │   └── {name}_detail_page.dart
│   ├── view_model/
│   │   └── {name}_detail_providers.dart
│   └── widgets/
│       └── {name}_detail_header.dart
├── list/
│   ├── view/
│   │   └── {name}_list_page.dart
│   ├── view_model/
│   │   └── {name}_list_providers.dart
│   └── widgets/
├── home/
│   ├── view/
│   │   └── {name}_home_section.dart
│   └── widgets/
└── utils/                         # (선택) 피처 전용 유틸
    └── {name}_utils.dart
```

**피처별 구조는 화면 단위**로 나뉜다. 모든 피처가 detail/list/home을 갖는 것은 아니며, 필요한 화면만 생성한다.

## Page 템플릿 (ConsumerStatefulWidget)

```dart
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:zivo_flutter/common/widgets/base_page_with_app_bar.dart';

class HospitalDetailPage extends ConsumerStatefulWidget {
  const HospitalDetailPage({super.key, required this.hospitalId});

  final int hospitalId;

  @override
  ConsumerState<HospitalDetailPage> createState() =>
      _HospitalDetailPageState();
}

class _HospitalDetailPageState extends ConsumerState<HospitalDetailPage> {
  @override
  Widget build(BuildContext context) {
    final detail = ref.watch(hospitalDetailProvider(widget.hospitalId));

    return BasePageWithAppBar(
      title: 'hospital.detail.title'.tr(),
      child: detail.when(
        data: (hospital) => _buildContent(hospital),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(child: Text('$error')),
      ),
    );
  }

  Widget _buildContent(HospitalDetail hospital) {
    return SingleChildScrollView(
      child: Column(
        children: [
          // 위젯 구성
        ],
      ),
    );
  }
}
```

## Page 템플릿 (ConsumerWidget - 상태 없는 경우)

```dart
class HospitalListPage extends ConsumerWidget {
  const HospitalListPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final listState = ref.watch(hospitalListProvider);

    return BasePageWithAppBar(
      title: 'hospital.list.title'.tr(),
      child: ListView.builder(
        itemCount: listState.items.length,
        itemBuilder: (context, index) {
          return HospitalListItem(hospital: listState.items[index]);
        },
      ),
    );
  }
}
```

## widgets/ 분리 기준

| 조건 | 위치 |
|------|------|
| 해당 피처 내에서만 사용 | `feature/{name}/detail/widgets/` |
| 같은 피처의 여러 화면에서 사용 | `feature/{name}/widgets/` (피처 루트) |
| 3곳 이상에서 재사용 | `common/widgets/`로 승격 |
| 앱 전체 레이아웃 (BasePage 등) | `common/widgets/` |

## 환경 설정 (flutter_dotenv)

```dart
// main.dart
import 'package:flutter_dotenv/flutter_dotenv.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await dotenv.load(fileName: '.env');
  // ...
}

// 사용 시
final apiKey = dotenv.env['API_KEY'] ?? '';
```

`.env` 파일은 `assets`에 포함되며, `pubspec.yaml`에 등록 필요:
```yaml
flutter:
  assets:
    - .env
```
