//PURPOSE - extract the information of Worldcup 2019 from "CRICINFO" and present that in form of excel and pdf
//REAL PURPOSE -to extract information and get information.

// npm init -y
// npm install minimist
// npm install axios
// npm installjsdom
// npm install excel4node
//npm install pdf-lib

//node CRICINFO.JS --source=https://www.espncricinfo.com/series/icc-cricket-world-cup-2019-1144415/match-results --excel=Worldcup.csv --datafolder=Cricdata
let minimist = require("minimist");
let axios = require("axios");
let jsdom = require("jsdom");
let excel = require("excel4node");
let pdf = require("pdf-lib");
let fs = require("fs");
let path = require("path");
let args = minimist(process.argv);

// download using axios
// read using jsdom
// make excelsheet using excel4node
// make pdf using pdf-lib

let responsekapromise = axios.get(args.source);
responsekapromise.then(function(response) {
    let html = response.data;
    let dom = new jsdom.JSDOM(html);
    let document = dom.window.document;

    let matches = [];
    let matchinfodiv = document.querySelectorAll("div.match-score-block");
    for (let i = 0; i < matchinfodiv.length; i++) {
        let matchdiv = matchinfodiv[i];
        let match = {
            t1: "",
            t2: "",
            t1s: "",
            t2s: "",
            result: ""
        };
        let namep = matchinfodiv[i].querySelectorAll("p.name");
        match.t1 = namep[0].textContent;
        match.t2 = namep[1].textContent;

        let scorespan = matchinfodiv[i].querySelectorAll("div.score-detail > span.score");
        if (scorespan.length == 2) {
            match.t1s = scorespan[0].textContent;
            match.t2s = scorespan[1].textContent;
        } else if (scorespan.length == 1) {
            match.t1s = scorespan[0].textContent;
            match.t2s = " ";
        } else {
            match.t1s = " ";
            match.t2s = " ";
        }

        let spanresult = matchinfodiv[i].querySelector("div.status-text > span");
        //querySelector because result is one of a particular match
        match.result = spanresult.textContent;
        matches.push(match);
    }
    let teamsJSONmatches = JSON.stringify(matches);
    fs.writeFileSync("matches.json", teamsJSONmatches, "utf-8");

    let teams = [];
    for (let i = 0; i < matches.length; i++) {
        putteamInteamsarrayIFmissing(teams, matches[i]);
    }
    for (let i = 0; i < matches.length; i++) {
        putMatchesnAppropriateteam(teams, matches[i]);
    }
    let teamsJSON = JSON.stringify(teams);
    fs.writeFileSync("teams.json", teamsJSON, "utf-8");
    createExcelFile(teams);
    createFolder(teams);
    //console.log(html); // extracts all html coding of this website
}).catch(function(err) {
    console.log(err);
})

function createScoreCard(teamname, match, filename) {
    //this function creates pdf for match in appropriate folder with correct details
    //we will use pdf-lib to create the pdf
    let t1 = teamname;
    let t2 = match.vs;
    let t1s = match.selfscore;
    let t2s = match.oppscore;
    let result = match.result;

    let templatebytes = fs.readFileSync("Template1.pdf");
    let promiseToloadbytes = pdf.PDFDocument.load(templatebytes);
    promiseToloadbytes.then(function(pdfDoc) {

        let page = pdfDoc.getPage(0);
        //page.drawText("Hello world");
        page.drawText(t1, {
            x: 360,
            y: 690,
            size: 8
        });
        page.drawText(t2, {
            x: 360,
            y: 670,
            size: 8
        });
        page.drawText(t1s, {
            x: 360,
            y: 653,
            size: 8
        });
        page.drawText(t2s, {
            x: 360,
            y: 634,
            size: 8
        });
        page.drawText(result, {
            x: 360,
            y: 618,
            size: 8
        });

        let promiseTosave = pdfDoc.save();
        promiseTosave.then(function(changedBytes) {
            fs.writeFileSync(filename, changedBytes);
        });
    });
}

function createFolder(teams) {
    fs.mkdirSync(args.datafolder);
    for (let i = 0; i < teams.length; i++) {
        let teamfN = path.join(args.datafolder, teams[i].name);
        fs.mkdirSync(teamfN);

        for (let j = 0; j < teams[i].matches.length; j++) {
            let filename = path.join(teamfN, teams[i].matches[j].vs + ".pdf");
            //fs.writeFileSync(filename, "", "utf-8");
            createScoreCard(teams[i].name, teams[i].matches[j], filename);
        }
    }
}

function createExcelFile(teams) {
    let wb = new excel.Workbook();

    for (i = 0; i < teams.length; i++) {
        let newcell = wb.addWorksheet(teams[i].name);
        newcell.cell(1, 1).string("VS");
        newcell.cell(1, 2).string("SELF-SCORE");
        newcell.cell(1, 3).string("OPPONENT-SCORE");
        newcell.cell(1, 4).string("RESULT");
        //newcell.cell(1, 5).number(teams[i].rank);

        for (let j = 0; j < teams[i].matches.length; j++) {
            //let vs = teams[i].matches[j].vs;
            //let result = teams[i].matches[j].result;
            newcell.cell(2 + j, 1).string(teams[i].matches[j].vs);
            newcell.cell(2 + j, 2).string(teams[i].matches[j].selfscore);
            newcell.cell(2 + j, 3).string(teams[i].matches[j].oppscore);
            newcell.cell(2 + j, 4).string(teams[i].matches[j].result);
        }
    }
    wb.write(args.excel);
    // let workbook = new excelsheet.Workbook();
    // let worksheet = workbook.addWorksheet("Sheet 1");
    // worksheet.columns = [{
    //         header: "Team",
    //         key: "name",
    //         width: 10
    //     },
    //     {
    //         header: "Matches",
    //         key: "matches",
    //         width: 10
    //     }
    // ];
    // for (let i = 0; i < teams.length; i++) {
    //     let team = teams[i];
    //     worksheet.addRow(team);
    // }
    // workbook.write(excelFileName);
}

function putteamInteamsarrayIFmissing(teams, match) {
    let t1indx = -1;
    for (let i = 0; i < teams.length; i++) {
        if (teams[i].name == match.t1) {
            t1indx = i;
            break;
        }
    }
    if (t1indx = -1) {
        teams.push({
            name: match.t1,
            matches: []
        })
    }
    let t2indx = -1;
    for (let i = 0; i < teams.length; i++) {
        if (teams[i].name == match.t2) {
            t2indx = i;
            break;
        }
    }
    if (t2indx = -1) {
        teams.push({
            name: match.t2,
            matches: []
        })
    }
}

function putMatchesnAppropriateteam(teams, match) {
    let t1indx = -1;
    for (let i = 0; i < teams.length; i++) {
        if (teams[i].name == match.t1) {
            t1indx = i;
            break;
        }
    }
    let team1 = teams[t1indx];
    team1.matches.push({
        vs: match.t2,
        selfscore: match.t1s,
        oppscore: match.t2s,
        result: match.result
    });
    let t2indx = -1;
    for (let i = 0; i < teams.length; i++) {
        if (teams[i].name == match.t2) {
            t1indx = i;
            break;
        }
    }
    let team2 = teams[t2indx];
    team1.matches.push({
        vs: match.t1,
        selfscore: match.t2s,
        oppscore: match.t1s,
        result: match.result
    });
}