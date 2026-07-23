import styles from './LoginPage.module.css';

export function LoginPage() {
  return (
    <div className={styles.container}>
      <div className={styles.left}>
        <h1>Sistema de Acompañamiento y Tutoría Universitaria</h1>
        <p>
          Facultad de Ingeniería de Sistemas y Mecánica Eléctrica ·
          Dirección de Bienestar Universitario
        </p>
        <div className={styles.footer}>
          Protocolo N° 01-2024-UNTRM/DBU · R.C.U. N° 283-2024-UNTRM/CU
        </div>
      </div>
      <div className={styles.right}>
        <h3>Iniciar sesión</h3>
        <div className={styles.sub}>Ingresa con tu cuenta institucional</div>
        <form onSubmit={(e) => e.preventDefault()}>
          <div className={styles.field}>
            <label>Correo institucional</label>
            <input
              type="email"
              className={styles.input}
              placeholder="usuario@untrm.edu.pe"
            />
          </div>
          <div className={styles.field}>
            <label>Contraseña</label>
            <input
              type="password"
              className={styles.input}
              placeholder="••••••••"
            />
          </div>
          <button type="submit" className={styles.btn}>
            Ingresar
          </button>
          <a href="#" className={styles.forgot}>
            ¿Olvidaste tu contraseña?
          </a>
        </form>
      </div>
    </div>
  );
}
