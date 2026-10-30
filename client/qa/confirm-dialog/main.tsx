import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ConfirmDialog} from '../../src/shared/components/ui/ConfirmDialog';
import '../../src/shared/styles/global.css';

function Check(){
  const [open,setOpen]=useState(false);
  const [busy,setBusy]=useState(false);
  const [fail,setFail]=useState(false);
  const [count,setCount]=useState(0);
  const [message,setMessage]=useState('Sin operaciones.');
  const confirm=async()=>{
    setBusy(true);setCount(n=>n+1);setMessage('Operación de prueba en curso.');
    try{
      await new Promise(resolve=>setTimeout(resolve,3000));
      if(fail){setMessage('Error de prueba: puedes cancelar o intentar otra vez.');throw new Error('Error simulado');}
      setOpen(false);setMessage('Prueba completada. No se modificó ningún dato.');
    }finally{setBusy(false);}
  };
  return <main style={{maxWidth:700,margin:'32px auto',padding:20}}>
    <h1>Comprobación de interfaz SIT</h1>
    <p>Esta página usa el diálogo real del sistema. Solo simula una operación; no tiene acceso a cuentas, base de datos ni correo.</p>
    <p>{window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'Tu dispositivo solicita reducir el movimiento. La rueda puede quedar quieta; la operación sigue funcionando.' : 'Tu dispositivo permite las animaciones. La rueda debería girar durante la espera.'}</p>
    <p>1. Abre el aviso. 2. Cancela y vuelve a abrirlo. 3. Confirma y espera tres segundos. Durante la espera no debe cerrarse ni iniciar otra operación.</p>
    <label><input type="checkbox" checked={fail} onChange={e=>setFail(e.target.checked)}/> Simular un error</label>
    <p><button onClick={()=>setOpen(true)}>Abrir confirmación</button></p>
    <p role="status">{message}</p><p>Operaciones iniciadas: <output aria-label="Operaciones">{count}</output></p>
    <ConfirmDialog open={open} title="Confirmar prueba" message={fail?message:'Esta acción de prueba no modifica información. Puedes cancelar antes de confirmar.'} confirmLabel="Confirmar prueba" loading={busy} onConfirm={confirm} onCancel={()=>setOpen(false)}/>
  </main>;
}
createRoot(document.getElementById('root')!).render(<Check/>);
