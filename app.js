"use strict";

console.log("LogScope final analysis engine boot OK");


/* =========================
   DOM ELEMENTS
========================= */

const logInput =
    document.querySelector("#logInput");

const logFile =
    document.querySelector("#logFile");

const selectedFileName =
    document.querySelector("#selectedFileName");

const sampleButton =
    document.querySelector("#sampleButton");

const clearButton =
    document.querySelector("#clearButton");

const analyzeButton =
    document.querySelector("#analyzeButton");


const totalCount =
    document.querySelector("#totalCount");

const errorCount =
    document.querySelector("#errorCount");

const warningCount =
    document.querySelector("#warningCount");

const infoCount =
    document.querySelector("#infoCount");


const resultMessage =
    document.querySelector("#resultMessage");

const eventCount =
    document.querySelector("#eventCount");

const eventList =
    document.querySelector("#eventList");


const infoPercent =
    document.querySelector("#infoPercent");

const warningPercent =
    document.querySelector("#warningPercent");

const errorPercent =
    document.querySelector("#errorPercent");


const infoBar =
    document.querySelector("#infoBar");

const warningBar =
    document.querySelector("#warningBar");

const errorBar =
    document.querySelector("#errorBar");


const analysisSummary =
    document.querySelector("#analysisSummary");


const eventSearch =
    document.querySelector("#eventSearch");

const filterButtons =
    document.querySelectorAll(".filter-button");


/* =========================
   STATE
========================= */

let currentEvents = [];

let currentFilter = "ALL";

let currentSearch = "";


/* =========================
   SAMPLE DATA
========================= */

const sampleLog = `[INFO] 2026-09-27 09:00:01 Server started
[INFO] 2026-09-27 09:00:03 Database connection established
[WARN] 2026-09-27 09:04:17 Memory usage reached 78%
[INFO] 2026-09-27 09:05:12 User authentication successful
[ERROR] 2026-09-27 09:08:44 Connection refused
[WARN] 2026-09-27 09:10:22 Response time exceeded threshold
[INFO] 2026-09-27 09:11:05 Health check completed
[ERROR] 2026-09-27 09:14:39 Permission denied
[INFO] 2026-09-27 09:15:00 Service restarted`;


/* =========================
   SAMPLE BUTTON
========================= */

sampleButton.addEventListener("click", function () {

    logInput.value = sampleLog;

    logFile.value = "";

    selectedFileName.textContent =
        "선택된 파일 없음";


    currentEvents = [];

    resetResult();


    showMessage(
        "샘플 로그를 불러왔습니다.",
        "Analyze Log 버튼을 눌러 분석 결과를 확인하세요."
    );

});


/* =========================
   CLEAR BUTTON
========================= */

clearButton.addEventListener("click", function () {

    logInput.value = "";

    logFile.value = "";

    selectedFileName.textContent =
        "선택된 파일 없음";


    currentEvents = [];

    currentFilter = "ALL";

    currentSearch = "";


    eventSearch.value = "";

    resetFilterButtons();

    resetResult();

    logInput.focus();

});


/* =========================
   FILE READER
========================= */

logFile.addEventListener("change", function () {

    const selectedFile =
        logFile.files[0];


    if (!selectedFile) {

        selectedFileName.textContent =
            "선택된 파일 없음";

        return;
    }


    const maximumFileSize =
        2 * 1024 * 1024;


    if (selectedFile.size > maximumFileSize) {

        selectedFileName.textContent =
            "파일 크기가 너무 큽니다.";


        showMessage(
            "파일을 불러올 수 없습니다.",
            "2MB 이하의 텍스트 로그 파일을 선택해 주세요."
        );


        logFile.value = "";

        return;
    }


    selectedFileName.textContent =
        `선택된 파일: ${selectedFile.name}`;


    const reader =
        new FileReader();


    reader.addEventListener("load", function () {

        logInput.value =
            String(reader.result ?? "");


        showMessage(
            "로그 파일을 불러왔습니다.",
            "Analyze Log 버튼을 눌러 분석하세요."
        );

    });


    reader.addEventListener("error", function () {

        selectedFileName.textContent =
            "파일 읽기 실패";


        showMessage(
            "파일을 읽지 못했습니다.",
            "다른 .txt 또는 .log 파일로 다시 시도해 주세요."
        );

    });


    reader.readAsText(selectedFile);

});


/* =========================
   ANALYZE BUTTON
========================= */

analyzeButton.addEventListener("click", function () {

    const logText =
        logInput.value.trim();


    if (logText === "") {

        currentEvents = [];

        resetResult();


        showMessage(
            "분석할 로그가 없습니다.",
            "로그 내용을 입력하거나 샘플 로그를 불러와 주세요."
        );


        logInput.focus();

        return;
    }


    const analysis =
        analyzeLog(logText);


    currentEvents =
        analysis.events;


    currentFilter =
        "ALL";


    currentSearch =
        "";


    eventSearch.value =
        "";


    resetFilterButtons();


    renderStatistics(
        analysis
    );


    renderDistribution(
        analysis
    );


    renderSummary(
        analysis
    );


    renderFilteredEvents();


    showMessage(
        "로그 분석이 완료되었습니다.",
        `${analysis.total}개의 로그 줄을 검사했습니다.`
    );

});


/* =========================
   FILTER BUTTONS
========================= */

filterButtons.forEach(function (button) {

    button.addEventListener("click", function () {

        currentFilter =
            button.dataset.filter;


        filterButtons.forEach(
            function (item) {

                item.classList.remove(
                    "active"
                );

            }
        );


        button.classList.add(
            "active"
        );


        renderFilteredEvents();

    });

});


/* =========================
   SEARCH
========================= */

eventSearch.addEventListener("input", function () {

    currentSearch =
        eventSearch.value
            .trim()
            .toLowerCase();


    renderFilteredEvents();

});

/* =========================
   INPUT CHANGE
========================= */

logInput.addEventListener("input", function () {

    if (currentEvents.length === 0) {
        return;
    }


    currentEvents = [];

    resetResult();


    showMessage(
        "로그 내용이 변경되었습니다.",
        "정확한 결과를 확인하려면 Analyze Log 버튼을 다시 실행하세요."
    );

});

/* =========================
   ANALYSIS
========================= */

function analyzeLog(logText) {

    const normalizedText =
        logText
            .replace(/\r\n/g, "\n")
            .replace(/\r/g, "\n");


    const originalLines =
        normalizedText.split("\n");


    let errors = 0;
    let warnings = 0;
    let info = 0;


    const events = [];


    originalLines.forEach(function (rawLine, index) {

        const line =
            rawLine.trim();


        if (line === "") {
            return;
        }


        const lineNumber =
            index + 1;


        let type =
            "OTHER";


        if (/\bERROR\b/i.test(line)) {

            type = "ERROR";
            errors += 1;

        }

        else if (/\bWARN(?:ING)?\b/i.test(line)) {

            type = "WARN";
            warnings += 1;

        }

        else if (/\bINFO\b/i.test(line)) {

            type = "INFO";
            info += 1;

        }


        events.push({
            type: type,
            lineNumber: lineNumber,
            text: line
        });

    });


    return {
        total: events.length,
        errors: errors,
        warnings: warnings,
        info: info,
        events: events
    };

}


/* =========================
   STATISTICS
========================= */

function renderStatistics(analysis) {

    totalCount.textContent =
        String(analysis.total);


    errorCount.textContent =
        String(analysis.errors);


    warningCount.textContent =
        String(analysis.warnings);


    infoCount.textContent =
        String(analysis.info);

}


/* =========================
   DISTRIBUTION
========================= */

function renderDistribution(analysis) {

    const total =
        analysis.total;


    const infoValue =
        calculatePercent(
            analysis.info,
            total
        );


    const warningValue =
        calculatePercent(
            analysis.warnings,
            total
        );


    const errorValue =
        calculatePercent(
            analysis.errors,
            total
        );


    infoPercent.textContent =
        `${infoValue}%`;


    warningPercent.textContent =
        `${warningValue}%`;


    errorPercent.textContent =
        `${errorValue}%`;


    infoBar.style.width =
        `${infoValue}%`;


    warningBar.style.width =
        `${warningValue}%`;


    errorBar.style.width =
        `${errorValue}%`;

}


function calculatePercent(value, total) {

    if (total === 0) {

        return 0;

    }


    return Number(
        (
            value / total * 100
        ).toFixed(1)
    );

}


/* =========================
   SUMMARY
========================= */

function renderSummary(analysis) {

    if (
        analysis.errors === 0 &&
        analysis.warnings === 0
    ) {

        analysisSummary.textContent =
            `${analysis.total}개의 로그를 분석했습니다. ERROR 또는 WARN 이벤트가 발견되지 않았습니다.`;

        return;
    }


    analysisSummary.textContent =
        `${analysis.total}개의 로그 중 오류 ${analysis.errors}개와 경고 ${analysis.warnings}개가 발견되었습니다.`;

}


/* =========================
   FILTER + SEARCH
========================= */

function renderFilteredEvents() {

    const filteredEvents =
        currentEvents.filter(
            function (event) {

                const matchesFilter =
                    currentFilter === "ALL" ||
                    event.type === currentFilter;


                const matchesSearch =
                    currentSearch === "" ||
                    event.text
                        .toLowerCase()
                        .includes(currentSearch);


                return (
                    matchesFilter &&
                    matchesSearch
                );

            }
        );


    renderEvents(
        filteredEvents
    );

}


/* =========================
   EVENT RENDERING
========================= */

function renderEvents(events) {

    eventList.replaceChildren();


    eventCount.textContent =
        `${events.length} events`;


    if (events.length === 0) {

        const emptyMessage =
            document.createElement("p");


        emptyMessage.className =
            "empty-state";


        emptyMessage.textContent =
            "조건에 맞는 이벤트가 없습니다.";


        eventList.appendChild(
            emptyMessage
        );


        return;
    }


    events.forEach(function (event) {

        const item =
            document.createElement("article");


        item.className =
            "event-item";


        const header =
            document.createElement("div");


        header.className =
            "event-item-header";


        const badge =
            document.createElement("span");


        badge.className =
            `event-badge ${event.type.toLowerCase()}`;


        badge.textContent =
            event.type;


        const lineNumber =
            document.createElement("span");


        lineNumber.className =
            "event-line";


        lineNumber.textContent =
            `Line ${event.lineNumber}`;


        const text =
            document.createElement("p");


        text.className =
            "event-text";


        text.textContent =
            event.text;


        header.append(
            badge,
            lineNumber
        );


        item.append(
            header,
            text
        );


        eventList.appendChild(
            item
        );

    });

}


/* =========================
   MESSAGE
========================= */

function showMessage(title, description) {

    resultMessage.replaceChildren();


    const icon =
        document.createElement("span");


    icon.className =
        "result-icon";


    icon.setAttribute(
        "aria-hidden",
        "true"
    );


    icon.textContent =
        "✓";


    const content =
        document.createElement("div");


    const strong =
        document.createElement("strong");


    strong.textContent =
        title;


    const paragraph =
        document.createElement("p");


    paragraph.textContent =
        description;


    content.append(
        strong,
        paragraph
    );


    resultMessage.append(
        icon,
        content
    );

}


/* =========================
   FILTER RESET
========================= */

function resetFilterButtons() {

    filterButtons.forEach(
        function (button) {

            button.classList.remove(
                "active"
            );


            if (
                button.dataset.filter === "ALL"
            ) {

                button.classList.add(
                    "active"
                );

            }

        }
    );

}


/* =========================
   RESET RESULT
========================= */

function resetResult() {

    totalCount.textContent = "0";

    errorCount.textContent = "0";

    warningCount.textContent = "0";

    infoCount.textContent = "0";


    infoPercent.textContent = "0%";

    warningPercent.textContent = "0%";

    errorPercent.textContent = "0%";


    infoBar.style.width = "0%";

    warningBar.style.width = "0%";

    errorBar.style.width = "0%";


    analysisSummary.textContent =
        "로그를 분석하면 요약 결과가 표시됩니다.";


    eventCount.textContent =
        "0 events";


    eventList.replaceChildren();


    const emptyMessage =
        document.createElement("p");


    emptyMessage.className =
        "empty-state";


    emptyMessage.textContent =
        "분석 결과가 이곳에 표시됩니다.";


    eventList.appendChild(
        emptyMessage
    );


    resultMessage.replaceChildren();


    const icon =
        document.createElement("span");


    icon.className =
        "result-icon";


    icon.setAttribute(
        "aria-hidden",
        "true"
    );


    icon.textContent =
        "⌁";


    const content =
        document.createElement("div");


    const strong =
        document.createElement("strong");


    strong.textContent =
        "아직 분석하지 않았습니다.";


    const paragraph =
        document.createElement("p");


    paragraph.textContent =
        "로그를 입력한 뒤 Analyze Log 버튼을 실행하세요.";


    content.append(
        strong,
        paragraph
    );


    resultMessage.append(
        icon,
        content
    );

}