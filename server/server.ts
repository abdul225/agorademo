require('dotenv').config();
const express = require('express');
const {RtcTokenBuilder,RtcRole} = require('agora-access-token');


const PORT = 8080;
const APP_ID = process.env.APP_ID;
const APP_CERTIFICATE = process.env.APP_CERTIFICATE;
const MSG = process.env.SECRETMSG;
const app = express();

const nocache = (req , resp,next) => {
    resp.header('Cache-Control','private, no-cache , no-store, must-revalidate');
    resp.header('Expires','-1');
    resp.header('Pragma','no-cache');
    next();
}

const generateAccessToken = (req, resp)=>{
    
    // set response
    resp.header('Access-Control-Allow-Origin', '*');
    // get channel name
    const channelName = req.query.channelName;
    if(!channelName){
        return resp.status(500).json({'error': 'channel name is required'});
    }
    // uid
    let uid = req.query.uid;
    if(!uid ||uid ==''){
        uid= 0;
    }
    //role 
    let role = req.query.role;
    if (role =='publisher'){
        role = RtcRole.PUBLISHER;       
    }
    else{
        role = RtcRole.SUBSCRIBER;
    }
    // expiration time for token 
    let expireTime = req.query.expireTime;
    if(!expireTime || expireTime ==''){
        expireTime = 7200;
    }else{
        expireTime = parseInt(expireTime,10);
    }
    //calculate prvilage expire time
    let currentTime = Math.floor(Date.now()/1000);
    const privilegeExpireTime = currentTime + expireTime;
    //build token
    const token  = RtcTokenBuilder.buildTokenWithUid('9e17cc4e397e4d288d27abc2824354ae','2883fd5d6b24492593d5d126ed17ea36',channelName,uid,role,privilegeExpireTime);

    //return token
    resp.json({'token':token});
}

app.get('/access-token', nocache,generateAccessToken);

app.listen(PORT, ()=>{
    console.log('hello listening on port: ', PORT, MSG);
});
