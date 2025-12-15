use sqlx::{PgPool};
use uuid::Uuid;
use chrono::{Utc, Duration};
use crate::models::RefreshToken;

pub async fn store_refresh_token(
    pool: &PgPool,
    user_id: Uuid,
    token_str: String,
    ttl_seconds: i64,
) -> anyhow::Result<RefreshToken> {
    let now = Utc::now();
    let expires_at = now + Duration::seconds(ttl_seconds);

    let token = sqlx::query_as!(
        RefreshToken,
        r#"
        INSERT INTO refresh_tokens (id, user_id, token, created_at, expires_at, revoked)
        VALUES ($1, $2, $3, $4, $5, FALSE)
        RETURNING id, user_id, token, created_at, expires_at, revoked
        "#,
        Uuid::new_v4(),
        user_id,
        token_str,
        now,
        expires_at
    )
    .fetch_one(pool)
    .await?;

    Ok(token)
}

pub async fn get_valid_refresh(
    pool: &PgPool,
    token: &str,
) -> anyhow::Result<RefreshToken> {
    let rec = sqlx::query_as!(
        RefreshToken,
        r#"
        SELECT id, user_id, token, created_at, expires_at, revoked
        FROM refresh_tokens
        WHERE token = $1
        AND revoked = FALSE
        AND expires_at > NOW()
        "#,
        token
    )
    .fetch_one(pool)
    .await?;

    Ok(rec)
}

pub async fn revoke_refresh_token(pool: &PgPool, token: &str) -> anyhow::Result<()> {
    sqlx::query!(
        "UPDATE refresh_tokens SET revoked = TRUE WHERE token = $1",
        token
    )
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn revoke_all_user_tokens(pool: &PgPool, user_id: Uuid) -> anyhow::Result<()> {
    sqlx::query!(
        "UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1",
        user_id
    )
    .execute(pool)
    .await?;

    Ok(())
}