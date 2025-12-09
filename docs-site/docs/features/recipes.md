# Recipes

The Recipes page is your cookbook with intelligent filtering by macro density and ingredient availability.

<figure>
  <img src="/assets/screenshots/recipes.png" alt="Recipes Page" class="screenshot">
  <figcaption class="screenshot-caption">Recipe browser with macro density filters</figcaption>
</figure>

## Overview

The recipe system provides:

- **Recipe Database**: Store all your recipes with ingredients
- **Macro Calculations**: Auto-computed nutrition per serving
- **Density Filters**: Find high-protein or low-carb options
- **Availability Filter**: Show only recipes you can make now
- **Meal Plan Integration**: Add recipes directly to calendar

## Recipe Cards

Each recipe displays:

| Field | Description |
|-------|-------------|
| Name | Recipe title |
| Servings | Number of portions |
| Per Serving | Calories and macros per portion |
| Total | Full recipe nutrition |
| Active Time | Hands-on cooking time |
| Total Time | Including passive time |
| Density Percentiles | Protein/carb rankings |

## Creating Recipes

### Basic Info

1. Click "New Recipe"
2. Enter name and description
3. Set servings count
4. Add active and total time

### Adding Ingredients

1. Click "Add Ingredient"
2. Select product from your catalog
3. Enter amount and unit
4. Repeat for all ingredients

### Automatic Macro Calculation

As you add ingredients:

- Calories sum automatically
- Protein, carbs, fats calculated
- Per-serving values computed
- Density percentiles update

<figure>
  <img src="/assets/screenshots/recipe-edit.png" alt="Recipe Editor" class="screenshot">
  <figcaption class="screenshot-caption">Recipe editor with ingredient list and macros</figcaption>
</figure>

## Filtering Recipes

### Can Be Made Filter

Shows only recipes you have ingredients for:

1. Enable "Can Be Made" toggle
2. System checks current inventory
3. Only cookable recipes display
4. Great for deciding what to cook tonight

### Protein Density Slider

Filter by protein efficiency:

- Measures grams of protein per 100 calories
- Higher = more protein-efficient
- Slider sets minimum threshold
- Example: 10+ g/100 cal filters to high-protein

### Carb Density Slider

Filter by carb content:

- Measures grams of carbs per 100 calories
- Lower = better for low-carb diets
- Slider sets maximum threshold
- Example: under 15 g/100 cal for keto-friendly

### Time Filters

Limit by prep time:

- **Active Time Max**: Hands-on minutes
- **Total Time Max**: Including passive cooking

## Density Percentiles

Each recipe shows percentile rankings:

```
Protein: 85th percentile
Carbs: 23rd percentile
```

This means:

- Protein density beats 85% of your recipes
- Carb density is lower than 77% of recipes

!!! tip "Finding Optimal Recipes"
    Sort by protein percentile to find your most protein-efficient meals. Great for hitting protein goals without excess calories.

## Recipe Execution

When you cook a recipe:

### Regular Cooking

1. Add recipe to meal plan
2. Mark as done when eaten
3. Ingredients deducted from inventory
4. Macros added to daily total

### Meal Prep Mode

1. Add recipe to meal plan as "Meal Prep"
2. Click "Execute" to batch cook
3. Ingredients deducted
4. [MEAL] products created for each serving
5. Consume [MEAL] products later

## Best Practices

1. **Complete Ingredients**: Add all ingredients for accurate macros
2. **Use Gram Weights**: Most accurate for nutrition
3. **Update Regularly**: Keep recipes current with your cooking style
4. **Review Percentiles**: Use density metrics to optimize meals
5. **Set Accurate Times**: Helps with meal planning

## Integration Points

| Feature | Integration |
|---------|-------------|
| Products | Ingredients sourced from product catalog |
| Inventory | "Can Be Made" checks stock levels |
| Meal Plan | Add recipes to calendar |
| Macros | Recipe macros flow to tracking |
| Shopping | Recipe ingredients added to shopping list |


