# Changes in Stage 4 compared to Stage 3

## Changes to Database Design.pdf

1. To address the missing row counts, we added images with row counts to prove at least 1000 rows were inserted into these tables as data. 

2. To address that query 1 and 2 were not advanced enough, we made new queries. The first one should have a subquery not easily repleaced by a WHERE, and a JOIN. The second one now has JOINs and GROUP BY. The row counts of the queries are also updated

3. To address the missing explain analyze screenshots, I added 4 screenshots for every query: 1 for the cost before and 3 for the cost after. Each query should also have 3 index plans and reasoning for why we chose a certain one, or why they were not chosen. 
