import dotenv from 'dotenv';
dotenv.config();
const PORT = parseInt(process.env.PORT || '4000', 10);
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;
if (!SUPABASE_JWT_SECRET) {
    throw new Error('SUPABASE_JWT_SECRET environment variable is required');
}
export const env = {
    PORT,
    SUPABASE_JWT_SECRET,
};
//# sourceMappingURL=env.js.map