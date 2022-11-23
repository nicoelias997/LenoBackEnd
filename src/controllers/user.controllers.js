import { validationResult } from "express-validator";
import { Usuario } from "../models/usuario";
import bcrypt from 'bcryptjs';
import {generarJWT, generarAutenticacionToken, obtenerToken, obtenerTokenData } from '../helpers/jwt';
import { enviarEmail, getTemplate } from "../helpers/mail";

export const consultarUsuarios = async (req, res) => {
  try{
    const listaUsuarios = await Usuario.find
      ({},{"password":0});
    res.status(200).json(listaUsuarios)
  } catch(e){
    res.status(400).json({
      message: "No pudimos obtener la lista de usuarios, intentelo nuevamente."
    })
  }
}


export const crearUsuario = async (req,res) => {
    try{
        const errors = validationResult(req)
        if(!errors.isEmpty()){
         return res.status(400).json({
            errors: errors.array()
          })
          
        }
        const { email, password } = req.body;

        let nuevoUsuario = await Usuario.findOne({ email }); //devulve un null

        if (nuevoUsuario) {
          //si el usuario existe
          return res.status(400).json({
            mensaje: "ya existe un usuario con el correo enviado",
          });
        }
    
        nuevoUsuario = new Usuario(req.body)

        const salt = bcrypt.genSaltSync();
        nuevoUsuario.password = bcrypt.hashSync(password, salt)

         const token = await obtenerToken(nuevoUsuario._id, nuevoUsuario.email)

         const template = getTemplate(nuevoUsuario.email, token)

         await enviarEmail(nuevoUsuario.email, "Este es un email de prueba", template)

        await nuevoUsuario.save()

        
        res.status(201).json({
            message: "Usuario creado con exito.",
            _id: nuevoUsuario._id,
            email: nuevoUsuario.email
        })

    } catch(e){
        console.log(e)
        res.status(404).json({
            message: "No pudimos crear el usuario.",
        })
    }
}

export const encontrarUsuario = async (req, res) => {
    try {
      // manejar los errores de la validacion
      const errors = validationResult(req);
      // errors.isEmpty() devuelve false si hay errores
      if (!errors.isEmpty()) {
        return res.status(400).json({
          errors: errors.array(),
        });
      }
  
      //verificar si existe un mail como el recibido
      const { email, password } = req.body;
  
      //verificar si el email ya existe
      let usuario = await Usuario.findOne({ email }); //devulve un null
      if (!usuario) {
        //si el usuario existe
        return res.status(400).json({
          mensaje: "Correo o password invalido - correo",
        });
      }
     
      // desencriptar el password
      const passwordValido = bcrypt.compareSync(password, usuario.password)
  // si no es valido el password
      if (!passwordValido) {
        return res.status(400).json({
          mensaje: "Correo o password invalido - password",
        });
      }
      //generar el token
      const token = await generarJWT(usuario._id, usuario.email)
  
      //responder que el usuario es correcto
      res.status(200).json({
        mensaje: "El usuario existe",
        _id: usuario._id,
        email: usuario.email,
        token
      });
    } catch (error) {
      console.log(error);
      res.status(400).json({
        mensaje: "usuario o contraseña invalido",
      });
    }
  };


  export const confirmEmail = async (req, res) => {
    try{
        //obtener el token
      const {token} = req.params;
        //verificamos la data
      const data = await obtenerTokenData(token)

      if(!data){
        return res.json({
          message: "Error al obtener data."
        })
      }
      const {email} = data.data.email
        //buscar si existe el usuario
        const usuario = await Usuario.findOne({email}) || null

        if(usuario === null){
          return res.json({
            message: "Usuario no encontrado."
          })
        }
        //verificamos el email identicos/mas seguridad con codigo
        if(email !== usuario.email){
          return res.redirect('/error')
        }
        //actualizar usuario
        usuario.estado = "Autenticado"
        //redireccionar a la confirmacion
        await usuario.save()

        return res.redirect(`/confirm/`)

    }
    catch(e){
      console.log(e)
      res.status(404).json({
          message: "No pudimos confirmar el usuario.",
      })
  }
  }




  export const resetPassword = async (req, res) => {
    try{
      const errors = validationResult(req);
      // errors.isEmpty() devuelve false si hay errores
      if (!errors.isEmpty()) {
        return res.status(400).json({
          errors: errors.array(),
        });
      }
      const {email} = req.body

      let usuario = await Usuario.findOne({email : email }); //devulve un null
      if (!usuario) {
        //si el usuario existe
        return res.status(400).json({
          mensaje: "No pudimos enviar un correo a esa direccion",
        });
      }      
      res.status(200).json({
        mensaje: "Email de recuperacion de contraseña enviado.",
        email: usuario.email
      })


    } catch(e){
      console.log(e)
    }
  }