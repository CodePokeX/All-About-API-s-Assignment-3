const express = require('express');
const myApp= express();
myApp.use(express.json());

const { initializeApp, applicationDefault, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp, FieldValue, Filter } = require('firebase-admin/firestore');

const serviceAccount = require('./all-about-api-s-smp-2024key.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();
const userCollection= db.collection('users');

myApp.listen(3000, ()=>{
    console.log("Running on port 3000");
});

myApp.get("/", (req,res)=>{
    res.send("Welcome to my API page. Go to /home for more details");
});

myApp.get("/home", (req,res)=>{
    res.send("Please create a user first at /user. Then you can create your dream list at /list.")
});

const duplicateCheck=async (req,res)=>{
    const searchId=req.query.uid;
    let uName=req.body.name;
    if(uName===undefined){
        uName=(await userCollection.doc(searchId).get()).data().name;
    }
    let uMail=req.body.email;
    if(uMail===undefined){
        uMail=(await userCollection.doc(searchId).get()).data().email;
    }
    let uAge=req.body.age;
    if(uAge===undefined){
        uAge=(await userCollection.doc(searchId).get()).data().age;
    }
    const conditions = [
        { field: 'email', value: uMail },
        { field: 'name', value: uName },
        { field: 'age', value: uAge}
    ];
    let query = userCollection;
    conditions.forEach((condition) => {
    query = query.where(condition.field, '==', condition.value);
    });
    const querySnapshot= await query.get();
    if (!querySnapshot.empty) {
        return false;
    } 
    else {
        return true;                            
    }
};

myApp.post("/user", async (req,res)=>{
    const uName=req.body.name;
    const uMail=req.body.email;
    const uAge=req.body.age;
    const uPassword=req.body.password;
    if(!(req.body.hasOwnProperty("name") && req.body.hasOwnProperty("email") && req.body.hasOwnProperty("age") && req.body.hasOwnProperty("password"))){
        res.status(400).send("Please enter name, email, age and password");
    }
    else{
        const user={
            "name":uName,
            "email":uMail,
            "age":uAge,
            "password":uPassword
        };
       duplicateCheck(req,res)
       .then((val)=>{
        if(val){
            userCollection.add(user).then((doc)=>{
                doc.update({
                "userid":doc.id
            });            
            userCollection.doc(doc.id).get().then((doc)=>{
                res.send(`${JSON.stringify(doc.data())} was created successfully!\n\nPlease remeber your user id. If forgotten, you will not be able to retrieve your data!`);
            });
            });
        }
        else{
            res.status(400).send(`User already exists!`);
        }
       });
}
});

myApp.get("/user", async (req,res)=>{
    const searchId=req.query.uid;
    const pswd=req.headers['password'];
    if(searchId===undefined){
        res.status(400).send(`Please add the user id as "uid" as a query parameter.`);
    }
    else{
        const doc=await userCollection.doc(searchId).get();
        if(doc.exists){
            if(pswd){
                if(pswd===doc.data().password){
                    const usr={
                        "name":doc.data().name,
                        "email":doc.data().email,
                        "age":doc.data().age,
                        "userid":doc.data().userid,
                        "password":doc.data().password
                    };
                    res.send(`${JSON.stringify(usr)}`);
                }
                else{
                    res.status(401).send(`Incorrect password!`);
                }
            }
            else{
                res.status(400).send(`Please give the password as a header: password !`);
            }
            
            }
            
        else{
            res.status(404).send(`User Id: ${searchId} not found!`);
        }
        }
});

myApp.put("/user", async (req,res)=>{
    const searchId=req.query.uid;
    const pswd=req.headers['password'];
    const uName=req.body.name;
    const uMail=req.body.email;
    const uAge=req.body.age;
    const uPassword=req.body.password;
    if(searchId===undefined){
        res.status(400).send(`Please add the user id as "uid" as a query parameter!`);
    }
    else{
        if(!(req.body.hasOwnProperty("name") || req.body.hasOwnProperty("email") || req.body.hasOwnProperty("age") || req.body.hasOwnProperty("password"))){
            res.status(400).send("Please enter name, email, age or password to be updated");
        }
        else{
            const doc=await userCollection.doc(searchId).get();
            if(doc.exists){
                if(pswd){
                    if(pswd===doc.data().password){
                        if(uAge!==undefined||uMail!==undefined||uName!==undefined||uPassword!==undefined){
                            duplicateCheck(req,res)
                            .then((val)=>{
                                if(val){
                                    if(uAge!==undefined){
                                        doc.ref.update({
                                            age:uAge
                                        });
                                    }
                                    if(uName!==undefined){
                                        doc.ref.update({
                                            name:uName
                                        });
                                    }
                                    if(uMail!==undefined){
                                        doc.ref.update({
                                            email:uMail
                                        });
                                    }
                                    if(uPassword!==undefined){
                                        doc.ref.update({
                                            password:uPassword
                                        });
                                    }
                                    res.send(`All updates made successfully!`);
                                }
                            else{
                                res.status(400).send(`User already exists!`);
                                }
                            });
                        }
                        else{
                            res.status(400).send(`Please enter one of the fields to be changed!`);
                        }
                    }
                    else{
                    res.status(401).send(`Incorrect password!`);
                    }
                }
                else{
                    res.status(400).send(`Please give the password as a header: password !`);
                }
            }
            else{
                res.status(404).send(`${searchId} not found!`);
            }
        }
    }
    
});

myApp.get("/list",async (req,res)=>{
    const searchId=req.query.uid;
    const pswd= req.headers['password'];
   if(searchId===undefined){
    res.status(400).send(`Please add the user id as "uid" as a query parameter!`);
   }
   else{
    const doc=await userCollection.doc(searchId).get();
    if(doc.exists){
        if(pswd){
            if(pswd===doc.data().password){
                res.send(doc.data().itemList);
               }
               else{
                res.status(401).send(`Incorrect password!`);
               }
        }
        else{
            res.status(400).send(`Please give the password as a header: password !`);
        }
    }
    else{
        res.status(404).send(`${searchId} not found!`);
    }
   }
});

myApp.post("/list", async (req,res)=>{
    const usrId=req.query.uid;
    const pswd=req.headers['password'];
    if(usrId===undefined){
        res.status(400).send(`Add your user id as "uid" as a query parameter!`);
    }
    else{
        const item=req.body.item;
        if(!(req.body.hasOwnProperty("item"))){
            res.status(400).send("Please add to your dream list as item");
        }
        else{
            const doc=await userCollection.doc(usrId).get();
            if(doc.exists){
                if(pswd){
                    if(pswd===doc.data().password){
                        const docRef=userCollection.doc(usrId);
                        const itemAdd=await docRef.update({
                            itemList: FieldValue.arrayUnion(item)
                        })
                        res.send(`${item} added successfully!`);
                    }
                    else{
                    res.status(401).send(`Incorrect password!`);
                    }
                }
                else{
                    res.status(400).send(`Please give the password as a header: password !`);
                }
            }
            else{
                res.status(404).send(`${searchId} not found!`);
            }
        }    
    }
    
});

myApp.put("/list", async (req,res)=>{
    const searchId=req.query.uid;
    const searchItem=req.query.item;
    const pswd=req.headers['password'];
    if(searchId===undefined || searchItem===undefined){
        res.status(400).send(`Add your user id as "uid" and the item to replace as "item" as query parameters!`);
    }
    else{
        const newItem=req.body.item;
        if(!(req.body.hasOwnProperty("item"))){
            res.status(400).send("Please add to your dream list as item");
        }
        else{
            const doc=await userCollection.doc(searchId).get();
            if(doc.exists){
                if(pswd){
                    if(pswd===doc.data().password){
                        const index=doc.data().itemList.indexOf(searchItem);
                        if(index>-1){
                            const itemRem= await doc.ref.update({
                                itemList: FieldValue.arrayRemove(searchItem)
                            });
                            const itemAdd= await doc.ref.update({
                                itemList: FieldValue.arrayUnion(newItem)
                            });
                            res.send(`${searchItem} successfully replaced by ${newItem}!`);
                        }
                        else{
                            res.status(404).send(`${searchItem} not found!`);
                        }
                       }
                       else{
                        res.status(401).send(`Incorrect password!`);
                       }
                }
                else{
                    res.status(400).send(`Please give the password as a header: password !`);
                }
            }
            else{
                res.status(404).send(`User id: ${searchId} not found!`);
            }
        }   
    }    
});

myApp.delete("/list", async (req,res)=>{
    const searchId=req.query.uid;
    const searchItem=req.query.item;
    const pswd=req.headers['password'];
    if(searchId===undefined || searchItem===undefined){
        res.status(400).send(`Add your user id as "uid" and the item to delete as "item" as query parameters!`);
    }
    else{
        const doc=await userCollection.doc(searchId).get();
        if(doc.exists){
            if(pswd){
                if(pswd===doc.data().password){
                    const index=doc.data().itemList.indexOf(searchItem);
                    if(index>-1){
                        const updatedList=doc.data().itemList.filter(item => item !== searchItem);
                        doc.ref.update({
                            itemList: updatedList
                        })
                        .then(()=>{
                            res.send(`${searchItem} successfully deleted!`);
                        });
                    }
                    else{
                        res.status(404).send(`${searchItem} not found!`);
                    }
                   }
                   else{
                    res.status(401).send(`Incorrect password!`);
                   }
            }
            else{
                res.status(400).send(`Please give the password as a header: password !`);
            }
        }
        else{
            res.status(404).send(`User id: ${searchId} not found!`);
        }
    }
});

myApp.delete("/user", async (req,res)=>{
    const searchId=req.query.uid;
    const pswd=req.headers['password'];
    if(searchId===undefined){
        res.status(400).send(`Add your user id as "uid" as a query parameter!`);
    }
    else{
        userCollection.doc(searchId).get().then((doc)=>{
            if(doc.exists){
                if(pswd){
                    if(pswd===doc.data().password){
                        doc.ref.delete();
                        res.send(`User with uid: ${searchId} successfully deleted!`);
                    }
                    else{
                    res.status(401).send(`Incorrect password!`);
                    }
                }
                else{
                    res.status(400).send(`Please give the password as a header: password !`);
                }
            }
            else{
                res.status(404).send(`User Id: ${searchId} not found!`);
            }
        });
    }
});