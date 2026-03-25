import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { SupabaseService } from './src/supabase/supabase.service';

async function checkSchema() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const supabase = app.get(SupabaseService).getClient();
  
  console.log('--- TABLES ---');
  const { data: tables, error: tablesError } = await (supabase as any).rpc('get_tables'); // A generic trick if exists
  
  console.log('--- COLUMNS portal_tariffs ---');
  const { data: columns, error: colError } = await supabase.from('portal_tariffs').select('*').limit(1);
  if (columns && columns.length > 0) {
    console.log(Object.keys(columns[0]));
  } else {
    console.log('No data in portal_tariffs or error:', colError);
  }
  
  await app.close();
}

checkSchema();
