# Macro Tracking

The Home dashboard provides real-time macro tracking with progress bars and goal management.

<figure>
  <img src="../../assets/screenshots/macros.png" alt="Macro Tracking Dashboard" class="screenshot">
  <figcaption class="screenshot-caption">Daily macro progress with calories, protein, carbs, and fats</figcaption>
</figure>

## Overview

The macro tracking system provides:

- **Daily Progress**: Real-time bars for each macro
- **Goal Setting**: Configurable targets
- **Multiple Sources**: Meal plan, temp items, inventory consumption
- **Historical View**: Browse past days

## Progress Display

The dashboard shows four progress bars:

| Macro | Formula | Icon |
|-------|---------|------|
| Calories | Auto-calculated from macros | 🔥 |
| Protein | Grams consumed | 💪 |
| Carbs | Grams consumed | 🌾 |
| Fats | Grams consumed | 🥑 |

### Visual Indicators

- **Green Bar**: Under goal
- **Yellow Bar**: Approaching goal (90%+)
- **Red Bar**: Over goal

### Percentage Display

Each bar shows:

```
1500 / 2200 cal (68%)
```

- Current intake
- Daily goal
- Percentage complete

## Setting Goals

Configure your targets:

1. Click **🎯 Target Macros** on Home
2. Enter values:
   - Carbs (grams)
   - Protein (grams)
   - Fats (grams)
3. Calories calculate automatically

### Calorie Formula

```
Calories = (Carbs × 4) + (Protein × 4) + (Fats × 9)
```

!!! tip "Goal Calculation"
    Start with your TDEE (Total Daily Energy Expenditure), then set macros based on your goals:
    
    - **Fat Loss**: Higher protein, moderate fats, lower carbs
    - **Muscle Gain**: High protein, moderate everything
    - **Maintenance**: Balanced macros

## Macro Sources

Macros accumulate from multiple sources:

### 1. Meal Plan Completion

When you mark a meal as done:

- Recipe/product macros add to daily total
- Only "done" items count
- Meal prep items don't count until consumed

### 2. Temp Items

Quick-log items not in your inventory:

1. Click "Add Temp Item"
2. Enter name and macros
3. Instantly added to daily total

<figure>
  <img src="../../assets/screenshots/temp-item.png" alt="Add Temp Item" class="screenshot">
  <figcaption class="screenshot-caption">Quick-logging a temp item</figcaption>
</figure>

Use temp items for:

- Restaurant meals
- Snacks at work
- Items without barcodes
- One-off foods

### 3. Direct Consumption

Using Scanner in Consume mode:

- Scan barcode
- Enable "Add to meal plan"
- Macros count toward daily total

## Consumed Items List

Below the progress bars, see what you've eaten:

| Column | Description |
|--------|-------------|
| Item | Food name |
| Calories | Cal for that item |
| Protein | Grams protein |
| Carbs | Grams carbs |
| Fats | Grams fats |
| Actions | Delete (for temp items) |

## Planned vs Consumed

The dashboard shows both:

- **Consumed**: What you've actually eaten (counted)
- **Planned**: What's scheduled but not marked done

This helps you plan your remaining meals for the day.

## Historical View

Browse past days:

1. Use date navigation on dashboard
2. See historical consumption
3. Review patterns over time
4. Identify trends

## Taste Profile

Complement macro tracking with preferences:

1. Click **📝 Taste Profile** on Home
2. Enter dietary preferences
3. Note allergies or restrictions
4. Information used for planning assistance

## Best Practices

1. **Log Immediately**: Mark meals done right after eating
2. **Use Temp Items**: Don't skip untracked foods
3. **Review Daily**: Check progress before dinner
4. **Adjust Goals**: Update targets as needs change
5. **Be Consistent**: Track every day for best insights

## Integration Points

| Feature | Integration |
|---------|-------------|
| Meal Plan | Completed meals add to totals |
| Scanner | Consume mode can add to tracking |
| Recipes | Recipe macros flow through meal plan |
| Products | Product macros used for calculations |
| Settings | Goals stored in configuration |

