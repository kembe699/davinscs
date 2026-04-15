import CategoryListingPage from "@/components/CategoryListingPage";
import { cameras } from "@/data/products";

const CamerasPage = () => <CategoryListingPage category="cameras" products={cameras} />;

export default CamerasPage;
