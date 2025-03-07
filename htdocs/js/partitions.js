"use strict";
// SPDX-License-Identifier: GPL-3.0-or-later
// myMPD (c) 2018-2022 Juergen Mang <mail@jcgames.de>
// https://github.com/jcorporation/mympd

function initPartitions() {
    document.getElementById('listPartitionsList').addEventListener('click', function(event) {
        event.stopPropagation();
        event.preventDefault();
        if (event.target.nodeName === 'A') {
            const action = getData(event.target, 'action');
            const partition = getData(event.target.parentNode.parentNode, 'partition');
            if (action === 'delete') {
                deletePartition(event.target, partition);
            }
        }
        else if (event.target.nodeName === 'TD') {
            const partition = getData(event.target.parentNode, 'partition');
            switchPartition(partition);
        }
    }, false);

    document.getElementById('partitionOutputsList').addEventListener('click', function(event) {
        event.stopPropagation();
        event.preventDefault();
        if (event.target.nodeName === 'BUTTON') {
            toggleBtnChk(event.target);
        }
        else if (event.target.nodeName === 'TD') {
            const target = event.target.parentNode.firstChild.firstChild;
            toggleBtnChk(target);
        }
    }, false);

    document.getElementById('modalPartitions').addEventListener('shown.bs.modal', function () {
        showListPartitions();
    });

    document.getElementById('modalPartitionOutputs').addEventListener('shown.bs.modal', function () {
        sendAPI("MYMPD_API_PLAYER_OUTPUT_LIST", {
            "partition": "default"
        }, function(obj) {
            const outputList = document.getElementById('partitionOutputsList');
            if (checkResult(obj, outputList) === false) {
                return;
            }
            allOutputs = obj.result.data;
            sendAPI("MYMPD_API_PLAYER_OUTPUT_LIST", {
                "partition": settings.partition
            }, parsePartitionOutputsList, true);
        }, true);
    });
}

//eslint-disable-next-line no-unused-vars
function moveOutputs() {
    const outputs = [];
    const selection = document.getElementById('partitionOutputsList').getElementsByClassName('active');
    if (selection.length === 0) {
        return;
    }
    for (let i = 0, j = selection.length; i < j; i++) {
        outputs.push(getData(selection[i].parentNode.parentNode, 'output'));
    }
    sendAPI("MYMPD_API_PARTITION_OUTPUT_MOVE", {
        "outputs": outputs
    }, moveOutputsCheckError, true);
}

function moveOutputsCheckError(obj) {
    if (obj.error) {
        showModalAlert(obj);
    }
    else {
        uiElements.modalPartitionOutputs.hide();
        showNotification(tn('Outputs moved to current partition'), '', 'general', 'info');
    }
}

function parsePartitionOutputsList(obj) {
    const outputList = document.getElementById('partitionOutputsList');
    if (checkResult(obj, outputList) === false) {
        return;
    }

    elClear(outputList);
    const curOutputs = [];
    for (let i = 0; i < obj.result.numOutputs; i++) {
        if (obj.result.data[i].plugin !== 'dummy') {
            curOutputs.push(obj.result.data[i].name);
        }
    }

    const selBtn = elCreateText('button', {"class": ["btn", "btn-secondary", "btn-xs", "mi", "mi-small", "me-3"]}, 'radio_button_unchecked');

    let nr = 0;
    for (let i = 0, j = allOutputs.length; i < j; i++) {
        if (curOutputs.includes(allOutputs[i].name) === false) {
            const tr = elCreateNode('tr', {},
                elCreateNodes('td', {}, [
                    selBtn.cloneNode(true),
                    document.createTextNode(allOutputs[i].name)
                ])
            );
            setData(tr, 'output', allOutputs[i].name);
            outputList.appendChild(tr);
            nr++;
        }
    }
    if (nr === 0) {
        outputList.appendChild(emptyRow(1));
    }
}

//eslint-disable-next-line no-unused-vars
function savePartition() {
    cleanupModalId('modalPartitions');
    let formOK = true;

    const nameEl = document.getElementById('inputPartitionName');
    if (!validatePlnameEl(nameEl)) {
        formOK = false;
    }

    if (formOK === true) {
        sendAPI("MYMPD_API_PARTITION_NEW", {
            "name": nameEl.value
        }, savePartitionCheckError, true);
    }
}

function savePartitionCheckError(obj) {
    if (obj.error) {
        showModalAlert(obj);
    }
    else {
        showListPartitions();
    }
}

function switchPartitionCheckError(obj) {
    if (obj.error) {
        showModalAlert(obj);
    }
    else {
        BSN.Modal.getInstance(document.getElementById('modalPartitions')).hide();
        showNotification(tn('Partition switched'), '', 'general', 'info');
    }
}

//eslint-disable-next-line no-unused-vars
function showNewPartition() {
    cleanupModalId('modalPartitions');
    document.getElementById('listPartitions').classList.remove('active');
    document.getElementById('newPartition').classList.add('active');
    elHideId('listPartitionsFooter');
    elShowId('newPartitionFooter');
    const nameEl = document.getElementById('inputPartitionName');
    nameEl.value = '';
    setFocus(nameEl);
}

function showListPartitions() {
    cleanupModalId('modalPartitions');
    document.getElementById('listPartitions').classList.add('active');
    document.getElementById('newPartition').classList.remove('active');
    elShowId('listPartitionsFooter');
    elHideId('newPartitionFooter');
    sendAPI("MYMPD_API_PARTITION_LIST", {}, parsePartitionList, true);
}

function deletePartition(el, partition) {
    showConfirmInline(el.parentNode.previousSibling, tn('Do you really want to delete the partition?', {"partition": partition}), tn('Yes, delete it'), function() {
        sendAPI("MYMPD_API_PARTITION_RM", {
            "name": partition
        }, savePartitionCheckError, true);
    });  
}

function switchPartition(partition) {
    sendAPI("MYMPD_API_PARTITION_SWITCH", {
        "name": partition
    }, function(obj) {
        switchPartitionCheckError(obj);
        sendAPI("MYMPD_API_PLAYER_STATE", {}, parseState);
    }, true);
}

function parsePartitionList(obj) {
    const partitionList = document.getElementById('listPartitionsList');
    if (checkResult(obj, partitionList) === false) {
        return;
    }

    elClear(partitionList);

    for (let i = 0, j = obj.result.data.length; i < j; i++) {
        const tr = elCreateEmpty('tr', {});
        setData(tr, 'partition', obj.result.data[i].name);
        if (obj.result.data[i].name !== settings.partition) {
            tr.setAttribute('title', tn('Switch to'));
        }
        else {
            tr.classList.add('not-clickable');
            tr.setAttribute('title', tn('Active partition'));
        }
        const td = elCreateEmpty('td', {});
        if (obj.result.data[i].name === settings.partition) {
            td.classList.add('fw-bold');
            td.textContent = obj.result.data[i].name + ' (' + tn('current') + ')';
        }
        else {
            td.textContent = obj.result.data[i].name;
        }
        tr.appendChild(td);
        const partitionActionTd = elCreateEmpty('td', {"data-col": "Action"});
        if (obj.result.data[i].name !== 'default' &&
            obj.result.data[i].name !== settings.partition)
        {
            partitionActionTd.appendChild(
                elCreateText('a', {"href": "#", "title": tn('Delete'), "data-action": "delete", "class": ["mi", "color-darkgrey", "me-2"]}, 'delete')
            );
        }
        tr.appendChild(partitionActionTd);
        partitionList.appendChild(tr);
    }
}
