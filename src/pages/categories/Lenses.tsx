import CategoryListingPage from "@/components/CategoryListingPage";
import { lenses } from "@/data/products";

const LensesPage = () => <CategoryListingPage category="lenses" products={lenses} />;

export default LensesPage;
