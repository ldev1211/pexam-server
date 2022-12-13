const port = 3001;
const express = require('express');
const app = express();
const socket = require('socket.io');
const cors = require('cors');
const dotenv = require("dotenv");
const connection = require('./dbconnection');
const mylib = require('./mylib');
const e = require('express');
// const axios = require('axios');

let i=0;

// async function runAuth(){
//     while(true){
//         await new Promise(resolve=>{
//             setTimeout(()=>{
//                 resolve();
//                 axios({
//                     method:"get",
//                     url:"http://113.161.104.213:4000/stu_role/schedule/get_schedule_learn?ngay_trong_tuan=20/11/2022",
//                     headers:{
//                         "authorization":"Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiIsImZvciI6InN0dSJ9.eyJtc3N2IjoiTjIwRENQVDAwOSJ9.MTNkODdmYjc3MzlhZTZiOGJhYjk1NDkzNjY2ZmUzNDU4M2M2OGMzYTdmMzAyYzVmNGFhMjIzNmVjZjYxZTVjYg=="
//                     },
//                 }).then((result)=>{
//                     console.log(++i);
//                 }).catch(err=>{
//                     console.log(err);
//                 });
//             },1);
//         })
//     }
// }

// runAuth();

dotenv.config();

const server = app.listen(port,function(){
    console.log("Listening on port: "+port);
});

server.on('error', function(err){
    throw err;
});

server.setTimeout(0);

app.use(function(req, res, next) {
    next();
});
app.use(express.static('public'));
app.use(cors());

const io = socket(server,{
    cors: {
      origin: "*"
    }
});

app.get('/', function(req, res){
    res.status(401);
    res.json({
        error:true,
        message:"Bad request"
    });
    // res.send('Server is running');
});

io.on('connection',(socket)=>{
    console.log('Have user connected');
    socket.on("GET_LIST_KIND",()=>{
        const queryGetListKind = `SELECT * FROM kind`;
        connection.query(queryGetListKind,(errGet,resGet)=>{
            const dataListKind = mylib.parseToJSONFrDB(resGet);
            for(let i=0;i<dataListKind.length;++i){
                dataListKind[i].thumb = `${process.env.BASE_URL}/thumb/${dataListKind[i].thumb}`;
            }
            socket.emit("RETURN_LIST_KIND",{data_list:dataListKind});
        });
    });
    socket.on("SEARCH_QUESTION",(stringKeySearch)=>{
        let queryCondition = '';
        const wordSplited = stringKeySearch.split(' ');
        for(let i=0;i<wordSplited.length;++i){
            if(i<wordSplited.length-1){
                queryCondition += `question_content LIKE '%${wordSplited[i]}%' OR `;
            } else {
                queryCondition += `question_content LIKE '%${wordSplited[i]}%'`;
            }
        }
        let querySearchQuestion = `SELECT * FROM question WHERE ${queryCondition}`;
        connection.query(querySearchQuestion,(errSearch,resSearch)=>{
            if(errSearch) throw errSearch;
            const dataSearched = mylib.parseToJSONFrDB(resSearch);
            for(let i=0;i<dataSearched.length;++i){
                let frequency = 0;
                for(let j=0;j<wordSplited.length;++j){
                    if(dataSearched[i].question_content.indexOf(wordSplited[j])>-1) frequency++;
                }
                dataSearched[i].frequency = frequency;
            }
            socket.emit("RETURN_SEARCHED_QUESTION",{data_list:dataSearched});
        });
    });
    socket.on("GET_SUBJ",(codeKind)=>{
        const queryGetSubj = `SELECT subj.code_subj,subj.name_subj,COUNT(part.code_part) AS part_count
                                FROM subj INNER JOIN part ON subj.code_subj = part.code_subj
                                WHERE subj.code_kind = '${codeKind}'
                                GROUP BY subj.code_subj`;
        connection.query(queryGetSubj,(errGet,resGet)=>{
            const dataList = mylib.parseToJSONFrDB(resGet);
            socket.emit("RETURN_SUBJ",{data_list:dataList});
        });
    });
    socket.on("GET_EXAM",(codeSubj)=>{
        const queryGetPartExam = `SELECT part.*,COUNT(question.question_content) AS question_count
                                    FROM part INNER JOIN question ON part.code_part = question.code_part 
                                    WHERE part.code_subj = '${codeSubj}'
                                    GROUP BY question.code_part;`;
        connection.query(queryGetPartExam,(errGet,resGet)=>{
            const dataRows = mylib.parseToJSONFrDB(resGet);
            socket.emit("RETURN_EXAM_PART",{data_list:dataRows});
        });
    });
    socket.on("GET_DOCS_SUBJ",(codeSubj)=>{
        const queryGetDocs = `SELECT question.* FROM question INNER JOIN part ON question.code_part = part.code_part WHERE part.code_subj = '${codeSubj}';`;
        connection.query(queryGetDocs,(errGet,resGet)=>{
            const dataList = mylib.parseToJSONFrDB(resGet);
            for(let i=0;i<dataList.length;++i){
                if(dataList[i].img.length!=0) dataList[i].img = `${process.env.BASE_URL}/image/${dataList[i].img}`;
                if(dataList[i].ansa.includes('<img>')){
                    dataList[i].ansa = `${process.env.BASE_URL}/image/${dataList[i].ansa.split('<img>')[1]}`;
                }
            }
            console.log(dataList);
            socket.emit("RETURN_DOCS_SUBJ",{data_list:dataList});
        });
    });
    socket.on("GET_QUESTION_TESTING",(codePart)=>{
        const queryGetQuestion = `SELECT * FROM question WHERE code_part = '${codePart}'`;
        connection.query(queryGetQuestion,(errGet,resGet)=>{
            const dataList = mylib.parseToJSONFrDB(resGet);
            for(let i=0;i<dataList.length;++i){
                if(dataList[i].img.length!=0) dataList[i].img = `${process.env.BASE_URL}/image/${dataList[i].img}`;
                if(dataList[i].ansa.includes('<img>')){
                    dataList[i].ansa = `${process.env.BASE_URL}/image/${dataList[i].ansa.split('<img>')[1]}`;
                }
            }
            socket.emit("RETURN_QUESTION_TESTING",{data_list:dataList});
        });
    });
});