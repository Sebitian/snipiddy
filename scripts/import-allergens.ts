const Papa = require('papaparse');
const fs = require('fs');
const path = require('path');
const { supabaseService } = require('../lib/supabase-service');

async function importAllergenCSV() {
  try {
    const csvPath = path.join(__dirname, '../supabase/sources/allergens.csv');
    const csvFile = fs.readFileSync(csvPath, 'utf-8');
    
    return new Promise((resolve, reject) => {
      Papa.parse(csvFile, {
        header: true,
        complete: async (results : any) => {
          try {
            // Transform the data to match our database structure
            const transformedData = results.data.map((row : any) => ({
              food_product: row['Food Product'],
              main_ingredient: row['Main Ingredient'],
              sweetener: row['Sweetener'],
              fat_oil: row['Fat/Oil'],
              seasoning: row['Seasoning'],
              allergens: row['Allergens'], // Keep as string, don't split into array
              prediction: row['Prediction'],
              created_at: new Date().toISOString()
            }));

            console.log('Transformed first row:', transformedData[0]);
            console.log('Total rows to import:', transformedData.length);

            // Store in Supabase
            const response = await supabaseService.storeAllergenReferences(transformedData);
            
            if (response.success) {
              console.log('✅ Successfully imported data to Supabase');
              resolve(response);
            } else {
              console.error('❌ Error importing to Supabase:', response.error);
              reject(response.error);
            }
          } catch (error) {
            console.error('❌ Error processing data:', error);
            reject(error);
          }
        },
        error: (error : any) => {
          console.error('❌ Error parsing CSV:', error);
          reject(error);
        }
      });
    });
  } catch (error) {
    console.error('❌ Error reading file:', error);
    throw error;
  }
}

// Run the import
importAllergenCSV()
  .then(() => {
    console.log('🎉 Import process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Import process failed:', error);
    process.exit(1);
  });