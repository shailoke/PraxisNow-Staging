select column_name, column_default, is_nullable, data_type 
from information_schema.columns 
where table_name = 'users' and column_name in ('package_tier', 'available_sessions', 'total_sessions_used');

select prosrc from pg_proc where proname = 'handle_new_user';
