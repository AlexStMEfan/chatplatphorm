use argon2::{
    password_hash::{
        rand_core::OsRng,
        SaltString,
        Error as PasswordHashError,
    },
    Argon2,
    PasswordHash,
    PasswordHasher,
    PasswordVerifier,
};

pub fn hash_password(password: &str) -> Result<String, PasswordHashError> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let hashed = argon2
        .hash_password(password.as_bytes(), &salt)?
        .to_string();
    Ok(hashed)
}

pub fn verify_password(hash: &str, password: &str) -> Result<bool, PasswordHashError> {
    let parsed = PasswordHash::new(hash)?;
    let argon2 = Argon2::default();
    match argon2.verify_password(password.as_bytes(), &parsed) {
        Ok(()) => Ok(true),
        Err(e) => {
            // Логировать ошибку можно, но не менять тип ошибки
            eprintln!("Password verification error: {:?}", e);
            Err(e)
        }
    }
}