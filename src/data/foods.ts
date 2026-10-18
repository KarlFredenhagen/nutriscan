import type { FoodItem } from "../types";

/**
 * Compact seed nutrition database. Values are per 100 g / 100 ml and rounded to
 * typical reference values (USDA-style averages). Serving sizes are provided so
 * portion logging is one tap for common foods.
 */
type Seed = [
  name: string,
  calories: number,
  protein: number,
  carbs: number,
  fat: number,
  fiber: number,
  servingLabel?: string,
  servingGrams?: number,
];

const SEEDS: Seed[] = [
  // Fruit
  ["Apple", 52, 0.3, 13.8, 0.2, 2.4, "1 medium apple", 182],
  ["Banana", 89, 1.1, 22.8, 0.3, 2.6, "1 medium banana", 118],
  ["Orange", 47, 0.9, 11.8, 0.1, 2.4, "1 orange", 140],
  ["Strawberries", 32, 0.7, 7.7, 0.3, 2, "1 cup", 150],
  ["Blueberries", 57, 0.7, 14.5, 0.3, 2.4, "1 cup", 100],
  ["Grapes", 69, 0.7, 18.1, 0.2, 0.9, "1 cup", 150],
  ["Mango", 60, 0.8, 15, 0.4, 1.6, "1 cup diced", 200],
  ["Pineapple", 50, 0.5, 13.1, 0.1, 1.4, "1 cup chunks", 165],
  ["Watermelon", 30, 0.6, 7.6, 0.2, 0.4, "1 cup diced", 280],
  ["Avocado", 160, 2, 8.5, 14.7, 6.7, "1/2 avocado", 100],
  ["Pear", 57, 0.4, 15.2, 0.1, 3.1, "1 medium pear", 178],
  ["Kiwi", 61, 1.1, 14.7, 0.5, 3, "1 kiwi", 75],
  ["Peach", 39, 0.9, 9.5, 0.3, 1.5, "1 medium peach", 150],
  ["Raspberries", 52, 1.2, 11.9, 0.7, 6.5, "1 cup", 120],
  ["Dates", 282, 2.5, 75, 0.4, 8, "2 dates", 48],
  // Vegetables
  ["Broccoli", 34, 2.8, 6.6, 0.4, 2.6, "1 cup", 90],
  ["Spinach", 23, 2.9, 3.6, 0.4, 2.2, "1 cup raw", 30],
  ["Carrot", 41, 0.9, 9.6, 0.2, 2.8, "1 carrot", 61],
  ["Tomato", 18, 0.9, 3.9, 0.2, 1.2, "1 tomato", 123],
  ["Cucumber", 15, 0.7, 3.6, 0.1, 0.5, "1/2 cucumber", 100],
  ["Bell pepper", 31, 1, 6, 0.3, 2.1, "1 pepper", 120],
  ["Red onion", 40, 1.1, 9.3, 0.1, 1.7, "1/2 onion", 55],
  ["Sweet potato", 86, 1.6, 20.1, 0.1, 3, "1 medium", 130],
  ["Potato", 77, 2, 17, 0.1, 2.2, "1 medium", 150],
  ["Cauliflower", 25, 1.9, 5, 0.3, 2, "1 cup", 100],
  ["Zucchini", 17, 1.2, 3.1, 0.3, 1, "1 cup sliced", 124],
  ["Lettuce", 15, 1.4, 2.9, 0.2, 1.3, "1 cup shredded", 50],
  ["Mushrooms", 22, 3.1, 3.3, 0.3, 1, "1 cup sliced", 70],
  ["Green beans", 31, 1.8, 7, 0.2, 3.4, "1 cup", 100],
  ["Asparagus", 20, 2.2, 3.9, 0.1, 2.1, "6 spears", 90],
  ["Sweet corn", 96, 3.4, 21, 1.5, 2.4, "1 ear", 90],
  ["Green peas", 81, 5.4, 14.5, 0.4, 5.7, "1 cup", 80],
  ["Kale", 49, 4.3, 8.8, 0.9, 3.6, "1 cup chopped", 67],
  ["Cabbage", 25, 1.3, 5.8, 0.1, 2.5, "1 cup shredded", 89],
  // Protein
  ["Chicken breast", 165, 31, 0, 3.6, 0, "1 fillet", 170],
  ["Chicken thigh", 209, 26, 0, 10.9, 0, "1 thigh", 120],
  ["Ground beef (15% fat)", 250, 26, 0, 15, 0, "1 patty", 100],
  ["Beef steak", 271, 25, 0, 19, 0, "1 steak", 200],
  ["Pork chop", 231, 26, 0, 14, 0, "1 chop", 150],
  ["Bacon", 541, 37, 1.4, 42, 0, "2 slices", 20],
  ["Turkey breast", 135, 30, 0, 1, 0, "1 serving", 150],
  ["Salmon", 208, 20, 0, 13, 0, "1 fillet", 150],
  ["Tuna (canned in water)", 132, 29, 0, 1, 0, "1 can", 120],
  ["Cod", 82, 18, 0.7, 0.7, 0, "1 fillet", 150],
  ["Shrimp", 99, 24, 0.2, 0.3, 0, "1 cup", 100],
  ["Sardines", 208, 25, 0, 11, 0, "1 tin", 100],
  ["Egg", 143, 12.6, 0.7, 9.5, 0, "1 large egg", 50],
  ["Egg white", 52, 10.9, 0.7, 0.2, 0, "1 white", 33],
  ["Tofu", 76, 8, 1.9, 4.8, 0.3, "1/2 block", 100],
  ["Tempeh", 192, 20, 7.6, 11, 0, "1 serving", 100],
  ["Lentils (cooked)", 116, 9, 20, 0.4, 7.9, "1 cup", 198],
  ["Chickpeas (cooked)", 164, 8.9, 27.4, 2.6, 7.6, "1 cup", 164],
  ["Black beans (cooked)", 132, 8.9, 23.7, 0.5, 8.7, "1 cup", 172],
  ["Edamame", 121, 11.9, 8.9, 5.2, 5.2, "1 cup", 155],
  ["Whey protein powder", 380, 78, 8, 4, 0, "1 scoop", 30],
  // Dairy & alternatives
  ["Whole milk", 61, 3.2, 4.8, 3.3, 0, "1 glass", 244],
  ["Skim milk", 34, 3.4, 5, 0.1, 0, "1 glass", 244],
  ["Almond milk (unsweetened)", 17, 0.6, 0.6, 1.2, 0.3, "1 glass", 240],
  ["Oat milk", 47, 1, 7.5, 1.5, 0.8, "1 glass", 240],
  ["Cheddar cheese", 403, 25, 1.3, 33, 0, "1 slice", 28],
  ["Mozzarella", 280, 28, 3.1, 17, 0, "1 slice", 28],
  ["Parmesan", 392, 36, 3.2, 27, 0, "1 tbsp grated", 20],
  ["Feta", 264, 14, 4.1, 21, 0, "1 serving", 28],
  ["Butter", 717, 0.9, 0.1, 81, 0, "1 tsp", 5],
  ["Cream cheese", 342, 6, 4.1, 34, 0, "1 tbsp", 15],
  ["Greek yogurt (2%)", 73, 10, 3.9, 1.9, 0, "1 cup", 170],
  ["Plain yogurt", 61, 3.5, 4.7, 3.3, 0, "1 cup", 170],
  // Grains & bakery
  ["White rice (cooked)", 130, 2.7, 28.2, 0.3, 0.4, "1 cup", 158],
  ["Brown rice (cooked)", 112, 2.6, 24, 0.9, 1.8, "1 cup", 195],
  ["Quinoa (cooked)", 120, 4.4, 21, 1.9, 2.8, "1 cup", 185],
  ["Oats (dry)", 389, 16.9, 66, 6.9, 10.6, "1/2 cup", 40],
  ["Oatmeal (cooked)", 71, 2.5, 12, 1.5, 1.7, "1 cup", 234],
  ["Whole wheat bread", 247, 13, 41, 3.4, 7, "1 slice", 28],
  ["White bread", 265, 9, 49, 3.2, 2.7, "1 slice", 28],
  ["Sourdough bread", 289, 12, 56, 1.7, 2.4, "1 slice", 50],
  ["Pasta (cooked)", 158, 5.8, 31, 0.9, 1.8, "1 cup", 140],
  ["Whole wheat pasta", 124, 5, 27, 0.5, 3.9, "1 cup", 140],
  ["Flour tortilla", 306, 8.2, 51, 7.5, 3, "1 tortilla", 49],
  ["Corn tortilla", 218, 5.7, 45, 2.9, 6.3, "1 tortilla", 26],
  ["Bagel", 250, 10, 49, 1.5, 2.2, "1 bagel", 98],
  ["Croissant", 406, 8.2, 45, 21, 2.6, "1 croissant", 57],
  ["Granola", 471, 10, 64, 20, 7, "1/2 cup", 45],
  ["Couscous (cooked)", 112, 3.8, 23, 0.2, 1.4, "1 cup", 157],
  ["Pancakes", 227, 6.4, 28, 8.6, 0.9, "1 pancake", 75],
  // Meals & takeaway
  ["Pizza margherita", 266, 11, 33, 10, 2.3, "1 slice", 100],
  ["Cheeseburger", 254, 13, 24, 12, 1.5, "1 burger", 200],
  ["French fries", 312, 3.4, 41, 15, 3.8, "1 medium", 117],
  ["Salmon sushi roll", 150, 6, 22, 3.5, 0.6, "6 pieces", 200],
  ["Chicken burrito", 206, 8, 25, 8, 3, "1 burrito", 300],
  ["Chicken caesar salad", 120, 9, 4, 8, 1, "1 bowl", 300],
  ["Spaghetti bolognese", 130, 7, 15, 5, 1.5, "1 plate", 350],
  ["Fried rice", 163, 4.5, 22, 6, 1, "1 bowl", 250],
  ["Tomato soup", 42, 1, 7, 1, 1, "1 bowl", 245],
  ["Hummus", 166, 8, 14, 10, 6, "2 tbsp", 50],
  ["Chicken curry", 150, 10, 5, 10, 1, "1 bowl", 300],
  ["Dal", 116, 7, 20, 1, 6, "1 bowl", 250],
  ["Chicken biryani", 190, 8, 25, 6, 1.5, "1 plate", 300],
  ["Falafel", 333, 13, 32, 18, 5, "3 pieces", 60],
  ["Beef tacos", 226, 9, 20, 12, 3, "2 tacos", 200],
  ["Pad thai", 190, 8, 26, 6, 1.5, "1 plate", 300],
  ["Pho", 60, 5, 7, 1, 0.5, "1 bowl", 500],
  ["Ramen", 90, 5, 11, 3, 0.8, "1 bowl", 500],
  ["Fried chicken", 320, 22, 12, 20, 0.5, "2 pieces", 150],
  ["Sausage", 301, 12, 2, 27, 0, "1 sausage", 80],
  ["Ham", 145, 21, 1.5, 5.5, 0, "2 slices", 60],
  ["Cheese sandwich", 280, 12, 30, 11, 1.5, "1 sandwich", 150],
  // Snacks, nuts & sweets
  ["Peanut butter", 588, 25, 20, 50, 6, "1 tbsp", 16],
  ["Almonds", 579, 21, 22, 50, 12.5, "1 handful", 28],
  ["Walnuts", 654, 15, 14, 65, 6.7, "1 handful", 28],
  ["Cashews", 553, 18, 30, 44, 3.3, "1 handful", 28],
  ["Chia seeds", 486, 17, 42, 31, 34, "1 tbsp", 12],
  ["Olive oil", 884, 0, 0, 100, 0, "1 tbsp", 14],
  ["Honey", 304, 0.3, 82, 0, 0.2, "1 tbsp", 21],
  ["Dark chocolate (70%)", 598, 7.8, 46, 43, 11, "2 squares", 20],
  ["Milk chocolate", 535, 7.7, 59, 30, 3.4, "1 bar", 45],
  ["Protein bar", 350, 30, 40, 10, 5, "1 bar", 60],
  ["Potato chips", 536, 7, 53, 35, 4.8, "1 small bag", 28],
  ["Popcorn", 387, 13, 78, 4.5, 15, "1 bowl", 30],
  ["Ice cream", 207, 3.5, 24, 11, 0.7, "1 scoop", 66],
  ["Chocolate chip cookie", 480, 5, 64, 22, 2, "1 cookie", 30],
  ["Donut", 452, 4.9, 51, 25, 2, "1 donut", 70],
  ["Blueberry muffin", 385, 6, 54, 16, 1.5, "1 muffin", 110],
  ["Brownie", 466, 6, 50, 28, 2, "1 piece", 60],
  // Drinks
  ["Orange juice", 45, 0.7, 10.4, 0.2, 0.2, "1 glass", 240],
  ["Apple juice", 46, 0.1, 11.3, 0.1, 0.2, "1 glass", 240],
  ["Cola", 42, 0, 10.6, 0, 0, "1 can", 330],
  ["Black coffee", 2, 0.1, 0, 0, 0, "1 cup", 240],
  ["Latte (2% milk)", 55, 3, 5.5, 2, 0, "1 medium", 350],
  ["Cappuccino", 40, 2, 3.5, 1.8, 0, "1 cup", 200],
  ["Green tea", 1, 0, 0.2, 0, 0, "1 cup", 240],
  ["Beer", 43, 0.5, 3.6, 0, 0, "1 bottle", 355],
  ["Red wine", 85, 0.1, 2.6, 0, 0, "1 glass", 147],
  ["Berry smoothie", 60, 1, 13, 0.5, 1.5, "1 glass", 300],
  ["Protein shake", 50, 8, 3, 1, 0, "1 glass", 330],
  ["Milk chocolate bar", 535, 7.7, 59, 30, 3.4, "1 bar", 45],
];

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const FOODS: FoodItem[] = SEEDS.map(
  ([name, calories, protein, carbs, fat, fiber, servingLabel, servingGrams]) => ({
    id: `db-${slug(name)}`,
    name,
    per100: true,
    calories,
    protein,
    carbs,
    fat,
    fiber,
    servingLabel,
    servingGrams,
    source: "db",
  }),
);

export const POPULAR_IDS = [
  "db-egg",
  "db-banana",
  "db-chicken-breast",
  "db-white-rice-cooked",
  "db-oats-dry",
  "db-greek-yogurt-2",
  "db-whole-wheat-bread",
  "db-avocado",
  "db-salmon",
  "db-peanut-butter",
];

export function searchFoods(query: string, extra: FoodItem[] = [], limit = 40): FoodItem[] {
  const all = [...extra, ...FOODS];
  const q = query.trim().toLowerCase();
  if (!q) {
    const popular = POPULAR_IDS.map((id) => all.find((f) => f.id === id)).filter(
      (f): f is FoodItem => Boolean(f),
    );
    return [...popular, ...all.filter((f) => !popular.includes(f))].slice(0, limit);
  }
  const tokens = q.split(/\s+/);
  const scored = all
    .map((food) => {
      const haystack = `${food.name} ${food.brand ?? ""}`.toLowerCase();
      let score = -1;
      if (haystack === q) score = 100;
      else if (haystack.startsWith(q)) score = 80;
      else if (haystack.includes(q)) score = 60;
      else if (tokens.every((t) => haystack.includes(t))) score = 40;
      return { food, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.food.name.length - b.food.name.length);
  return scored.slice(0, limit).map((x) => x.food);
}

export function findFoodByName(name: string, extra: FoodItem[] = []): FoodItem | undefined {
  const q = name.trim().toLowerCase();
  return [...extra, ...FOODS].find((f) => f.name.toLowerCase() === q);
}
