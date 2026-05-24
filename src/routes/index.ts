import { Router } from "express";
import addressRouter from "../modules/address/address.route";
import { authRoute } from "../modules/auth/auth.route";
import { avatarRoutes } from "../modules/avatar/avatar.route";
import { carouselRoutes } from "../modules/carousel/carousel.route";
import cartRouter from "../modules/cart/cart.route";
import { categoryRoutes } from "../modules/category/category.route";
import { contactRouter } from "../modules/contact/contact.route";
import couponRouter from "../modules/coupon/coupon.route";
import { flashSaleRoutes } from "../modules/flash-sale/flash-sale.route";
import orderRouter from "../modules/order/order.route";
import orderSettingsRouter from "../modules/order-settings/order-settings.route";
import paymentMethodRouter from "../modules/payment-method/payment-method.route";
import purchaseDisclaimerRouter from "../modules/purchase-disclaimer/purchase-disclaimer.route";
import rbacRouter from "../modules/rbac/rbac.route";
import staffRouter from "../modules/staff/staff.route";
import { productRoutes } from "../modules/products/products.route";
import reviewRouter from "../modules/review/review.route";
import { testRoutes } from "../modules/tests/tests.route";
import transactionRouter from "../modules/transaction/transaction.route";
import { userRoute } from "../modules/users/users.route";
import wishlistRouter from "../modules/wishlist/wishlist.route";

const router = Router();
interface IModuleRoutes {
  path: string;
  route: Router;
}

const moduleRoutes: IModuleRoutes[] = [
  { path: "/tests", route: testRoutes },
  {
    path: "/auth",
    route: authRoute,
  },
  {
    path: "/users",
    route: userRoute,
  },
  {
    path: "/avatars",
    route: avatarRoutes,
  },
  {
    path: "/categories",
    route: categoryRoutes,
  },
  {
    path: "/products",
    route: productRoutes,
  },
  {
    path: "/carousels",
    route: carouselRoutes,
  },
  {
    path: "/flash-sales",
    route: flashSaleRoutes,
  },
  {
    path: "/carts",
    route: cartRouter,
  },
  {
    path: "/orders",
    route: orderRouter,
  },
  {
    path: "/order-settings",
    route: orderSettingsRouter,
  },
  {
    path: "/reviews",
    route: reviewRouter,
  },
  {
    path: "/wishlists",
    route: wishlistRouter,
  },
  {
    path: "/addresses",
    route: addressRouter,
  },
  {
    path: "/coupons",
    route: couponRouter,
  },
  {
    path: "/contacts",
    route: contactRouter,
  },
  {
    path: "/purchase-disclaimers",
    route: purchaseDisclaimerRouter,
  },
  {
    path: "/payment-methods",
    route: paymentMethodRouter,
  },
  {
    path: "/transactions",
    route: transactionRouter,
  },
  {
    path: "/rbac",
    route: rbacRouter,
  },
  {
    path: "/staff",
    route: staffRouter,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
