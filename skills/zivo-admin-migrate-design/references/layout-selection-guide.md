# 레이아웃 선택 가이드

## 결정 플로우

```
HTML 분석 시작
│
├─ 좌측 리스트 + 우측 상세 패널?
│   → DraggableLayout
│   (esim/*, hotel/customer, hotel/room, hotel/reservation 등)
│
├─ 좌측 섹션 네비 + 우측 긴 폼 or 상세?
│   → SyncNavLayout
│   (hotel/property, hotel/settings, *-detail, *-register)
│
├─ 언더라인 탭 분기가 최상위 구조?
│   → UnderlineTabLayout (또는 TabSection 내부 중첩)
│
├─ 단순 리스트 + 필터 + 페이지네이션?
│   → PageContainer + TableCard
│   (대부분의 *-list, report, settlement, review)
│
├─ 대시보드 (KPI 카드 + 차트 + 최근 테이블)?
│   → PageContainer + StatsGrid + StatCard
│
└─ 등록/수정 폼 (섹션 네비 불필요)?
    → PageContainer + FormSection
```

---

## 도메인별 추천 레이아웃

| 도메인 | HTML 파일 | 추천 레이아웃 | ZIVO_ADMIN 매핑 |
|--------|----------|-------------|----------------|
| **hotel** | index.html / dashboard | PageContainer + StatsGrid | hotel/DashboardPage — 이미 구현됨 |
| hotel | property.html | SyncNavLayout | hotel/PropertyPage — 이미 구현됨 |
| hotel | property-register.html | SyncNavLayout + FormSection | hotel/PropertyRegisterPage — 이미 구현됨 |
| hotel | reservation.html | DraggableLayout | hotel/ReservationPage — 이미 구현됨 |
| hotel | room.html | DraggableLayout | hotel/RoomPage — 이미 구현됨 |
| hotel | room-register.html | SyncNavLayout + FormSection | hotel/RoomRegisterPage — 이미 구현됨 |
| hotel | inventory.html | PageContainer + TableCard (캘린더 뷰 포함) | hotel/InventoryPage — 이미 구현됨 |
| hotel | customer.html | DraggableLayout | hotel/CustomerPage — 이미 구현됨 |
| hotel | settings.html | DraggableLayout | hotel/SettingsPage — 이미 구현됨 |
| hotel | promotion.html | PageContainer + TableCard | hotel/PromotionPage — 이미 구현됨 |
| hotel | content.html | PageContainer + TableCard | hotel/ContentPage — 이미 구현됨 |
| hotel | review.html | PageContainer + TableCard | hotel/ReviewPage — 이미 구현됨 |
| hotel | report.html | PageContainer + TableCard | hotel/ReportPage — 이미 구현됨 |
| hotel | report-stats.html | PageContainer + StatsGrid | hotel/ReportStatsPage — 이미 구현됨 |
| hotel | report-download.html | PageContainer + TableCard | hotel/ReportDownloadPage — 이미 구현됨 |
| hotel | settlement.html | PageContainer + TableCard | hotel/SettlementPage — 이미 구현됨 |
| hotel | permission.html | PageContainer + TableCard | hotel/PermissionPage — 이미 구현됨 |
| **esim** | index.html / dashboard | PageContainer + StatsGrid | esim/DashboardPage — 이미 구현됨 |
| esim | usage.html | DraggableLayout | esim/UsagePage — 이미 구현됨 |
| esim | usage-detail.html | SyncNavLayout | esim/UsageDetailPage — 이미 구현됨 |
| esim | customer.html | DraggableLayout | esim/CustomerPage — 이미 구현됨 |
| esim | customer-detail.html | SyncNavLayout | esim/CustomerDetailPage — 이미 구현됨 |
| esim | cs.html | DraggableLayout | esim/CSPage — 이미 구현됨 |
| esim | cs-detail.html | SyncNavLayout | esim/CSDetailPage — 이미 구현됨 |
| esim | issue.html | DraggableLayout | esim/IssuePage — 이미 구현됨 |
| esim | issue-detail.html | SyncNavLayout | esim/IssueDetailPage — 이미 구현됨 |
| esim | product.html | DraggableLayout | esim/ProductPage — 이미 구현됨 |
| esim | product-register.html | SyncNavLayout + FormSection | esim/ProductRegisterPage — 이미 구현됨 |
| esim | order.html | DraggableLayout | esim/OrderPage — 이미 구현됨 |
| esim | order-detail.html | SyncNavLayout | esim/OrderDetailPage — 이미 구현됨 |
| esim | report.html | PageContainer + TableCard | esim/ReportPage — 이미 구현됨 |
| esim | settings.html | DraggableLayout | esim/SettingsPage — 이미 구현됨 |
| **taxi** | index.html | PageContainer + StatsGrid | general/taxi/TaxiRideManagementPage — 이미 구현됨 |
| taxi | ride-management.html | PageContainer + TableCard | general/taxi/TaxiRideManagementPage — 이미 구현됨 |
| taxi | ride-detail.html | SyncNavLayout | general/taxi/TaxiDetailPage — 이미 구현됨 |
| taxi | ride-completed.html | PageContainer + TableCard | general/taxi/TaxiCompletedPage — 이미 구현됨 |
| taxi | ride-cancelled.html | PageContainer + TableCard | general/taxi/TaxiCancelledPage — 이미 구현됨 |
| taxi | driver-management.html | DraggableLayout | general/taxi/TaxiDriverPage — **미구현** |
| taxi | settlement.html | PageContainer + TableCard | general/taxi/TaxiSettlementHistoryPage — 이미 구현됨 |
| taxi | chat-inquiry.html | DraggableLayout | general/taxi/TaxiChatPage — 이미 구현됨 |
| taxi | chat-detail.html | SyncNavLayout | general/taxi/TaxiChatDetailPage — **미구현** |
| **beauty** | 01-dashboard.html | PageContainer + StatsGrid | beauty/DashboardPage — **미구현** |
| beauty | 02-01-salon-list.html | PageContainer + TableCard | beauty/SalonListPage — **미구현** |
| beauty | 02-02-salon-register.html | SyncNavLayout + FormSection | beauty/SalonRegisterPage — **미구현** |
| beauty | 03-01-designer-list.html | PageContainer + TableCard | beauty/DesignerListPage — **미구현** |
| beauty | 03-02-designer-register.html | SyncNavLayout + FormSection | beauty/DesignerRegisterPage — **미구현** |
| beauty | 04-01-category-list.html | PageContainer + TableCard | beauty/CategoryListPage — **미구현** |
| beauty | 05-01-booking-list.html | DraggableLayout | beauty/BookingListPage — **미구현** |
| beauty | 05-02-booking-detail.html | SyncNavLayout | beauty/BookingDetailPage — **미구현** |
| beauty | 06-01-payment-list.html | PageContainer + TableCard | beauty/PaymentListPage — **미구현** |
| beauty | 07-01-cancel-list.html | PageContainer + TableCard | beauty/CancelListPage — **미구현** |
| beauty | 08-01-review-list.html | PageContainer + TableCard | beauty/ReviewListPage — **미구현** |
| **qr-order** | 01-dashboard.html | PageContainer + StatsGrid | qr-order/DashboardPage — **미구현** |
| qr-order | 02-01-store-list.html | PageContainer + TableCard | qr-order/StoreListPage — **미구현** |
| qr-order | 02-02-store-detail.html | SyncNavLayout | qr-order/StoreDetailPage — **미구현** |
| qr-order | 02-03-store-register.html | SyncNavLayout + FormSection | qr-order/StoreRegisterPage — **미구현** |
| qr-order | 03-01-menu-list.html | DraggableLayout | qr-order/MenuListPage — **미구현** |
| qr-order | 04-01-order-list.html | DraggableLayout | qr-order/OrderListPage — **미구현** |
| qr-order | 05-01-payment-list.html | PageContainer + TableCard | qr-order/PaymentListPage — **미구현** |
| qr-order | 06-01-table-list.html | PageContainer + TableCard | qr-order/TableListPage — **미구현** |
| qr-order | 07-01-review-list.html | PageContainer + TableCard | qr-order/ReviewListPage — **미구현** |

---

## Footer 중복 방지 규칙

| 레이아웃 | Footer 처리 |
|---------|------------|
| `PageContainer` | Layout 레벨에서 자동 렌더링 — 별도 처리 불필요 |
| `DraggableLayout` | `showCompanyFooter` prop 추가 필수, 외부 Footer 제거 |
| `SyncNavLayout` | `showCompanyFooter` prop 추가 필수, 외부 Footer 제거 |

> Layout 컴포넌트(HotelLayout, EsimLayout 등)는 `isSyncNavPage` 체크로 SyncNavLayout 페이지일 때 외부 Footer를 자동 숨김.
> `showCompanyFooter`를 빠뜨리면 Footer가 아예 표시되지 않으므로 반드시 추가할 것.
