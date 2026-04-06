# 커서 페이지네이션 + 무한스크롤

목록 화면에서 커서 기반 페이지네이션과 무한스크롤을 구현하는 재사용 가능한 패턴.

## CursorListState

```dart
@immutable
class CursorListState<T> {
  const CursorListState({
    required this.items,
    required this.isLoading,
    required this.isLoadingMore,
    required this.hasNext,
    required this.nextCursor,
    required this.errorMessage,
  });

  final List<T> items;
  final bool isLoading;        // 초기 로딩
  final bool isLoadingMore;    // 추가 로딩 (loadMore)
  final bool hasNext;          // 다음 페이지 존재 여부
  final int? nextCursor;       // 다음 페이지 커서
  final String? errorMessage;

  factory CursorListState.initial() {
    return CursorListState(
      items: [],
      isLoading: true,
      isLoadingMore: false,
      hasNext: false,
      nextCursor: null,
      errorMessage: null,
    );
  }

  CursorListState<T> copyWith({
    List<T>? items,
    bool? isLoading,
    bool? isLoadingMore,
    bool? hasNext,
    int? nextCursor,
    String? errorMessage,
  }) {
    return CursorListState(
      items: items ?? this.items,
      isLoading: isLoading ?? this.isLoading,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      hasNext: hasNext ?? this.hasNext,
      nextCursor: nextCursor ?? this.nextCursor,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }
}
```

## CursorPage + CursorPageFetcher

```dart
@immutable
class CursorPage<T> {
  const CursorPage({
    required this.items,
    required this.hasNext,
    required this.nextCursor,
  });

  final List<T> items;
  final bool hasNext;
  final int? nextCursor;
}

typedef CursorPageFetcher<T> = Future<CursorPage<T>> Function({int? cursor});
```

## CursorListNotifier

```dart
class CursorListNotifier<T> extends StateNotifier<CursorListState<T>> {
  CursorListNotifier(this._fetchPage) : super(CursorListState.initial()) {
    Future.microtask(loadInitial);  // 생성 즉시 첫 페이지 로드
  }

  final CursorPageFetcher<T> _fetchPage;
  bool _isRequesting = false;

  Future<void> loadInitial() async {
    if (_isRequesting) return;
    _isRequesting = true;

    state = state.copyWith(isLoading: true, isLoadingMore: false, errorMessage: null);

    try {
      final response = await _fetchPage(cursor: null);
      if (!mounted) return;

      state = state.copyWith(
        items: response.items,
        isLoading: false,
        hasNext: response.hasNext,
        nextCursor: response.nextCursor,
        errorMessage: null,
      );
    } catch (error) {
      if (!mounted) return;
      state = state.copyWith(isLoading: false, errorMessage: error.toString());
    } finally {
      _isRequesting = false;
    }
  }

  Future<void> loadMore() async {
    if (_isRequesting || state.isLoadingMore || !state.hasNext) return;

    _isRequesting = true;
    state = state.copyWith(isLoadingMore: true, errorMessage: null);

    try {
      final response = await _fetchPage(cursor: state.nextCursor);
      if (!mounted) return;

      state = state.copyWith(
        items: [...state.items, ...response.items],  // 기존 목록에 추가
        isLoadingMore: false,
        hasNext: response.hasNext,
        nextCursor: response.nextCursor,
      );
    } catch (error) {
      if (!mounted) return;
      state = state.copyWith(isLoadingMore: false, errorMessage: error.toString());
    } finally {
      _isRequesting = false;
    }
  }
}
```

## Provider 등록

```dart
final hospitalListProvider = StateNotifierProvider.autoDispose<
    CursorListNotifier<Hospital>,
    CursorListState<Hospital>>((ref) {
  final repo = ref.watch(hospitalRepositoryProvider);
  return CursorListNotifier<Hospital>(
    ({int? cursor}) => repo.getHospitalList(cursor: cursor),
  );
});
```

## UI 연동 (ScrollController)

```dart
class HospitalListPage extends ConsumerStatefulWidget {
  @override
  ConsumerState<HospitalListPage> createState() => _HospitalListPageState();
}

class _HospitalListPageState extends ConsumerState<HospitalListPage> {
  final _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      ref.read(hospitalListProvider.notifier).loadMore();
    }
  }

  @override
  Widget build(BuildContext context) {
    final listState = ref.watch(hospitalListProvider);

    if (listState.isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    return ListView.builder(
      controller: _scrollController,
      itemCount: listState.items.length + (listState.isLoadingMore ? 1 : 0),
      itemBuilder: (context, index) {
        if (index == listState.items.length) {
          return const Center(child: CircularProgressIndicator());
        }
        return HospitalListItem(hospital: listState.items[index]);
      },
    );
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }
}
```

## 새 목록 페이지 생성 체크리스트

1. Repository에 `CursorPage<T>`를 반환하는 메서드 추가
2. `StateNotifierProvider`로 `CursorListNotifier<T>` 등록
3. Page에서 `ScrollController` + `_onScroll` 설정
4. `ListView.builder`에서 `isLoadingMore` 로딩 인디케이터 표시
5. Pull-to-refresh 필요 시 `RefreshIndicator` + `loadInitial()` 연동
