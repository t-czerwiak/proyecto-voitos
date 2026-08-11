// Error con un codigo HTTP y un mensaje pensado para mostrarle al cliente.
//
// El errorHandler devuelve 500 generico ante cualquier error, justamente para
// no filtrar detalles internos. Pero hay casos donde el cliente SI necesita
// saber que paso ("el mail ya esta registrado", "password incorrecta") porque
// no es una falla del servidor sino algo que el usuario puede corregir.
//
// Lanzar un ErrorHttp es la forma de decir "este mensaje es seguro de mostrar".
export class ErrorHttp extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "ErrorHttp";
  }
}
