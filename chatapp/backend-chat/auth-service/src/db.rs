use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;
use crate::config::Config;

pub async fn pg_pool(cfg: &Config) -> anyhow::Result<PgPool> {
    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(&cfg.database_url)
        .await?;
    Ok(pool)
}