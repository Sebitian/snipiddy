# Changes in Stage 3 compared to Stage 2

## Changes to UML Diagram.pdf

1. We removed the explicit Foreign Keys for the many to one relationships in the UML diagram, since they are implied by the diagram instead. We also updated the diagram so that Allergen->Ingredient, Diet->Ingredient, and User->Allergen are all many-to-many. 

2. We removed the unlabeled relationship for User->Scan, removed the convert relationship, and made the arrow in the right direction for the Menu Items->Scan many-to-one relationship.

3. We removed attributes like allergens and restricted ingredients that are not in the schema.

## Changes to Conceptual and Database Design.pdf

1. We updated the entity and relationship assumptions to match our relational schema more closely, like removing the attributes that are not in the schema.
   
2. We changed the FK's in the relational schema to say what table and attribute they reference. We added the missing table for the Restricts many-to-many relationship between Diet and Ingredients. We also removed the table for the many-to-many relationship between Menu Item and Diet, since Menu Item has a relationship with Ingredient, which has a relationship with Diet.
   
3. Explicitly stated that we are using 3NF normalization.
