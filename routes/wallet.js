const User = require("../model/user");
const express = require('express');
const { make } = require('simple-body-validator');
const twilio = require('twilio');
const auth = require("../middleware/auth");
const Deposit = require("../model/deposits");
const request = require('request');
require('dotenv').config();

let app = express.Router();

app.post("/payment",async (req,res) => {


    const { amount, email} = req.body;
    
    const body  = JSON.stringify({amount,email,callback_url:'https://e-waste-e8125.web.app/'});
      request.post('https://api.paystack.co/transaction/initialize', {
        	'auth': {
            'bearer': 'sk_test_e3d31ea7f6fe860ecca346739d8d4b27659e7728'
             },
             body
},async (err,data)=> {
    if(err){
        res.send({err});
    }else{ 
        const info = JSON.parse(data.body);
        res.send({error:false,info});
    }
    });   
});
 
app.post("/topup",async (req,res) => {
    //verify transaction
    const { id } = req.body;
    request.get(`https://api.paystack.co/transaction/verify/${id}`, { 
  'auth': {
    'bearer': 'sk_test_e3d31ea7f6fe860ecca346739d8d4b27659e7728'
  }
},async (err,data)=> {
    if(err){
        res.send({err});
    }else{
        const info = JSON.parse(data.body);
 
        if(info.data.status == 'success'){
            const user = await User.findOne({ email:info.data.customer.email });
            if(user){
                

                walletamount = info.data.amount/100
                Object.assign(user,{wallet:user.wallet + walletamount});
                
                
                const deposit = await Deposit.create({
                    user:user.id,
                    amount:walletamount,
                    type:'credit',
                    reference:req.params.id
                });
                const transaction  = {
                    amount:walletamount,
                    type:'credit',
                }
                user.transactions.push(transaction);

                user.save();

                res.send({error:false,msg:`${walletamount} added to ${user.id}`,deposit});
            }else{
                res.send({error:true,msg:"User not found"});
            }
        }else{
            res.send({error:true,msg:"Transaction not succesful"});
        }
    }
});

});



app.get("/deposit",async (req,res) => {
    try {

        const deposits = await Deposit.find();
        res.send({error:false,deposits});
    } catch (error) {
        console.log(error)
        res.status(500).send({msg:"internal server error"});
    }
});

module.exports = app;

