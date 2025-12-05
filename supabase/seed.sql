-- ChefByte Seed Data
-- Default quantity units (system-wide, no user_id)

INSERT INTO quantity_units (user_id, name, name_plural) VALUES
    (NULL, 'Serving', 'Servings'),
    (NULL, 'Container', 'Containers'),
    (NULL, 'g', 'g'),
    (NULL, 'oz', 'oz'),
    (NULL, 'ml', 'ml'),
    (NULL, 'cup', 'cups'),
    (NULL, 'tbsp', 'tbsp'),
    (NULL, 'tsp', 'tsp')
ON CONFLICT DO NOTHING;
