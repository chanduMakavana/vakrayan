# 🛠️ Appwrite Database Schema: Default Values & Required Rules Design

To make your database robust and prevent client-side crashes, you should design your Appwrite collection attributes using these settings. 

---

## 1. `products` Collection (Drops Catalog)

| Attribute Key | Type | Required | Default Value | Why? |
| :--- | :--- | :---: | :---: | :--- |
| `name` | String | **Yes** | *None* | Product name is critical. |
| `price` | String | **Yes** | *None* | Price is critical. |
| `front_image_link`| String | **Yes** | *None* | Essential for rendering cards. |
| `description` | String | No | `""` (Empty string) | Prevents `null` reference errors in UI text tags. |
| `category` | String | **Yes** | *None* | Required for categorizing in shop filters. |
| `tags` | String Array| No | *None* | Varies per product (e.g. `["NEW DROP"]`). |
| `sizes` | String Array| No | *None* | Varies per product (e.g. `["S", "M", "L"]`). |
| `back_image_links`| String Array| No | *None* | Optional backframes images. |
| `sizes_stock` | String | No | `"{}"` | Stringified size-stock map. Defaulting to `"{}"` prevents `JSON.parse` failures. |
| `tag` | String | No | `""` | Legacy tag column, keep empty. |
| `discount_percent` | Integer| No | `0` | Default to `0` discount. |
| `color_group_id` | String | No | `""` | Optional variant group. |
| `color_name` | String | No | `""` | Optional color name. |
| `color_hex` | String | No | `""` | Optional color hex. |
| `fit_type` | String | No | `""` | Optional fit style. |
| `fabric_gsm` | String | No | `""` | Optional fabric weight. |

---

## 2. `cart` Collection (Shopping Bags)

| Attribute Key | Type | Required | Default Value | Why? |
| :--- | :--- | :---: | :---: | :--- |
| `userId` | String | **Yes** | *None* | Must link to an account. |
| `name` | String | **Yes** | *None* | Cart name identifier. |
| `size` | String | **Yes** | *None* | Size is required. |
| `price` | Float/Double| **Yes** | *None* | Numerical price is required. |
| `quantity` | Integer | No | `1` | Default to 1 item if not specified. |
| `subtotal` | Float/Double| **Yes** | *None* | Auto-calculated subtotal. |
| `product_id` | String | **Yes** | *None* | Product link is required. |
| `product_Image` | String | **Yes** | *None* | Required for cart thumbnails. |
| `cart_status` | String | No | `"active"` | Automatically marks new items as `"active"`. Can update to `"converted"` or `"abandoned"`. |

---

## 3. `orders` Collection (Shipping Manifests)

| Attribute Key | Type | Required | Default Value | Why? |
| :--- | :--- | :---: | :---: | :--- |
| `userId` | String | **Yes** | *None* | Link to purchasing user. |
| `customerName` | String | **Yes** | *None* | Receiver name. |
| `email` | String | **Yes** | *None* | Contact email. |
| `phone` | String | **Yes** | *None* | Contact phone. |
| `address` | String | **Yes** | *None* | Full shipping address text. |
| `items` | String | **Yes** | *None* | Stringified list of ordered items. |
| `total` | Float/Double| **Yes** | *None* | Order total paid. |
| `status` | String | No | `"PENDING"` | Automatically starts as `"PENDING"`. |
| `paymentMethod` | String | **Yes** | *None* | `"COD"` or `"ONLINE"`. |
| `paymentStatus` | String | No | `"PENDING"` | Default status until Razorpay capture confirms it. |
| `payment_status` | String | No | `"PENDING"` | Dual attribute field support. |
| `paymentProvider` | String | No | `"NONE"` | Defaults to `"NONE"` for COD orders. |
| `couponApplied` | String | No | `"NONE"` | Defaults to `"NONE"` if no code applied. |
| `coupon_code` | String | No | `"NONE"` | Dual attribute field support. |
| `discountAmount` | Float/Double| No | `0` | Defaults to 0 discount amount. |
| `discount_amount`| Float/Double| No | `0` | Dual attribute field support. |
| `razorpayOrderId` | String | No | `""` | Blank if COD order. |
| `razorpay_order_id`| String | No | `""` | Dual attribute field support. |
| `razorpayPaymentId`| String | No | `""` | Blank if COD order. |
| `razorpay_payment_id`| String | No | `""` | Dual attribute field support. |

---

## 4. `coupon_usage` Collection

| Attribute Key | Type | Required | Default Value | Why? |
| :--- | :--- | :---: | :---: | :--- |
| `userId` | String | **Yes** | *None* | Link to user database. |
| `couponCode` | String | **Yes** | *None* | Applied promo code. |
| `usedCount` | Integer | No | `1` | First redemption automatically sets this counter to `1`. |
| `lastUsedAt` | String | No | *None* | Timestamp registry. |

---

## 5. `restock_notifications` Collection

| Attribute Key | Type | Required | Default Value | Why? |
| :--- | :--- | :---: | :---: | :--- |
| `email` | String | **Yes** | *None* | Recipient email. |
| `productId` | String | **Yes** | *None* | Product target ID. |
| `size` | String | **Yes** | *None* | Out-of-stock size requested. |
| `notified` | Boolean | No | `false` | Defaults to `false` until admin sends mail. |
| `requestedAt` | String | No | *None* | Timestamp registry. |

---

## 6. `reviews` Collection

| Attribute Key | Type | Required | Default Value | Why? |
| :--- | :--- | :---: | :---: | :--- |
| `productId` | String | **Yes** | *None* | Target product ID. |
| `userId` | String | **Yes** | *None* | Review author user ID. |
| `userName` | String | No | `"Anonymous"` | Defaults to anonymous if name is missing. |
| `rating` | String | **Yes** | `"5"` | Default rating of 5 stars. |
| `comment` | String | **Yes** | *None* | Review feedback comment text. |

---

## 7. `addresses` Collection

| Attribute Key | Type | Required | Default Value | Why? |
| :--- | :--- | :---: | :---: | :--- |
| `userId` | String | **Yes** | *None* | Link to account user ID. |
| `customerName` | String | **Yes** | *None* | Shipping profile name. |
| `phone` | String | **Yes** | *None* | Phone number. |
| `addressLine` | String | **Yes** | *None* | Address line. |
| `city` | String | **Yes** | *None* | Target city. |
| `pincode` | String | **Yes** | *None* | Target zip/postal pincode. |

---

## 8. `wishlist` Collection

| Attribute Key | Type | Required | Default Value | Why? |
| :--- | :--- | :---: | :---: | :--- |
| `userId` | String | **Yes** | *None* | Associated user ID. |
| `productId` | String | **Yes** | *None* | Reference Product ID. |

---

## 9. `coupons_` Collection

| Attribute Key | Type | Required | Default Value | Why? |
| :--- | :--- | :---: | :---: | :--- |
| `code` | String | **Yes** | *None* | Promo coupon code (e.g. `"STREET50"`). |
| `discount` | Integer | **Yes** | *None* | Percentage discount. |
| `coupon_usage` | String | No | `""` | Optional relational tracker link, defaults to blank. |

---

## 10. `settings` Collection

| Attribute Key | Type | Required | Default Value | Why? |
| :--- | :--- | :---: | :---: | :--- |
| `announcementText` | String | **Yes** | *None* | Scrolling announcement text marquee. |
