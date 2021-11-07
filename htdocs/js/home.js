"use strict";
// SPDX-License-Identifier: GPL-3.0-or-later
// myMPD (c) 2018-2021 Juergen Mang <mail@jcgames.de>
// https://github.com/jcorporation/mympd

function initHome() {
    //home screen
    document.getElementById('HomeList').addEventListener('click', function(event) {
        if (event.target.classList.contains('card-body')) {
            const href = getData(event.target.parentNode, 'data-href');
            if (href !== undefined) {
               parseCmd(event, href);
            }
        }
        else if (event.target.classList.contains('card-footer')){
            popoverMenuHome(event);
        }
    }, false);
    
    document.getElementById('HomeList').addEventListener('contextmenu', function(event) {
        if (event.target.classList.contains('card-body') ||
            event.target.classList.contains('card-footer'))
        {
            popoverMenuHome(event);
        }
    }, false);

    document.getElementById('HomeList').addEventListener('long-press', function(event) {
        if (event.target.id === 'HomeList') {
            return;
        }
        popoverMenuHome(event);
    }, false);
   
    dragAndDropHome();

    //modals
    const selectHomeIconCmd = document.getElementById('selectHomeIconCmd');
    selectHomeIconCmd.addEventListener('change', function() {
        showHomeIconCmdOptions();
    }, false);

    document.getElementById('inputHomeIconBgcolor').addEventListener('change', function(event) {
        document.getElementById('homeIconPreview').style.backgroundColor = event.target.value;
    }, false);

    document.getElementById('inputHomeIconColor').addEventListener('change', function(event) {
        document.getElementById('homeIconPreview').style.color = event.target.value;
    }, false);

    document.getElementById('selectHomeIconImage').addEventListener('change', function(event) {
        const value = getSelectValue(event.target);
        if (value !== '') {
            document.getElementById('homeIconPreview').style.backgroundImage = 'url("' + subdir + '/pics/' + myEncodeURI(value)  + '")';
            elHideId('divHomeIconLigature');
            elClearId('homeIconPreview');
        }
        else {
            document.getElementById('homeIconPreview').style.backgroundImage = '';
            elShowId('divHomeIconLigature');
            document.getElementById('homeIconPreview').textContent = document.getElementById('inputHomeIconLigature').value;
        }
    }, false);
    
    document.getElementById('btnHomeIconLigature').parentNode.addEventListener('show.bs.dropdown', function () {
        const selLig = document.getElementById('inputHomeIconLigature').value;
        if (selLig !== '') {
            document.getElementById('searchHomeIconLigature').value = selLig;
            filterHomeIconLigatures();
        }
    }, false);
    
    const listHomeIconLigature = document.getElementById('listHomeIconLigature');
    const searchHomeIconCat = document.getElementById('searchHomeIconCat');

    elClear(listHomeIconLigature);
    elClear(searchHomeIconCat);
    searchHomeIconCat.appendChild(elCreateText('option', {"value": "all"}, tn('All')));
    for (const cat in materialIcons) {
        listHomeIconLigature.appendChild(elCreateText('h5', {"class": ["ml-1", "mt-2"]}, ucFirst(cat)));
        searchHomeIconCat.appendChild(elCreateText('option', {"value": cat}, ucFirst(cat)));
        for (const icon of materialIcons[cat]) {
            listHomeIconLigature.appendChild(elCreateText('button', {"class": ["btn", "btn-sm", "mi", "m-1"], "title": icon, "data-cat": cat}, icon));
        }
    }

    listHomeIconLigature.addEventListener('click', function(event) {
        if (event.target.nodeName === 'BUTTON') {
            event.preventDefault();
            selectHomeIconLigature(event.target);
        }
    });
    
    document.getElementById('searchHomeIconLigature').addEventListener('click', function(event) {
        event.stopPropagation();
    }, false);

    searchHomeIconCat.addEventListener('click', function(event) {
        event.stopPropagation();
    }, false);
    
    document.getElementById('searchHomeIconCat').addEventListener('change', function() {
        filterHomeIconLigatures();
    }, false);
    
    document.getElementById('searchHomeIconLigature').addEventListener('keydown', function(event) {
        event.stopPropagation();
        if (event.key === 'Enter') {
            event.preventDefault();
        }
    }, false);
    
    document.getElementById('searchHomeIconLigature').addEventListener('keyup', function(event) {
        if (event.key === 'Enter') {
            const sel = document.getElementById('listHomeIconLigature').getElementsByClassName('active')[0];
            if (sel !== undefined) {
                selectHomeIconLigature(sel);
                uiElements.dropdownHomeIconLigature.toggle();
            }
        }
        else {
            filterHomeIconLigatures();
        }
    }, false);
}

function selectHomeIconLigature(x) {
    document.getElementById('inputHomeIconLigature').value = x.getAttribute('title');
    document.getElementById('homeIconPreview').textContent = x.getAttribute('title');
    document.getElementById('homeIconPreview').style.backgroundImage = '';
    document.getElementById('selectHomeIconImage').value = '';
}

function filterHomeIconLigatures() {
    const str = document.getElementById('searchHomeIconLigature').value.toLowerCase();
    const cat = getSelectValueId('searchHomeIconCat');
    const els = document.getElementById('listHomeIconLigature').getElementsByTagName('button');
    for (let i = 0, j = els.length; i < j; i++) {
        if ((str === '' || els[i].getAttribute('title').indexOf(str) > -1) && (cat === 'all' || els[i].getAttribute('data-cat') === cat)) {
            elShow(els[i]);
            if (els[i].getAttribute('title') === str) {
                els[i].classList.add('active');
            }
            else {
                els[i].classList.remove('active');
            }
        }
        else {
            elHide(els[i]);
            els[i].classList.remove('active' );
        }
    }
    const catTitles = document.getElementById('listHomeIconLigature').getElementsByTagName('h5');
    if (cat === '') {
        for (let i = 0, j = catTitles.length; i < j; i++) {
            elShow(catTitles[i]);
        }
    }
    else {
        for (let i = 0, j = catTitles.length; i < j; i++) {
            elHide(catTitles[i]);
        }
    }
}

function parseHome(obj) {
    const cardContainer = document.getElementById('HomeList');
    const cols = cardContainer.getElementsByClassName('col');
    if (obj.error !== undefined) {
        elClear(cardContainer);
        const div = elCreateEmpty('div', {"class": ["ms-3", "mb-3", "not-clickable", "alert", "alert-danger"]});
        addIconLine(div, 'error_outline', tn(obj.error.message, obj.error.data));
        cardContainer.appendChild(div);
        setPagination(obj.result.totalEntities, obj.result.returnedEntities);    
        return;
    }
    if (cols.length === 0) {
        elClear(cardContainer);
    }
    if (obj.result.returnedEntities === 0) {
        elClear(cardContainer);
        const div = elCreateNodes('div', {"class": ["px-3", "py-1"]}, [
            elCreateText('h3', {}, tn('Homescreen')),
            elCreateText('p', {}, tn('Homescreen welcome'))
        ]);
        const ul = elCreateNodes('ul', {}, [
            elCreateNodes('li', {}, [
                elCreateText('b', {}, tn('View')),
                elCreateText('span', {}, ': ' + tn('Homescreen help view')),
                elCreateText('span', {"class": ["mi"]}, 'add_to_home_screen')
            ]),
            elCreateNodes('li', {}, [
                elCreateText('b', {}, tn('Playlist')),
                elCreateText('span', {}, ': ' + tn('Homescreen help playlist'))
            ])
        ]);
        if (features.featScripting === true) {
            ul.appendChild(
                elCreateNodes('li', {}, [
                    elCreateText('b', {}, tn('Script')),
                    elCreateText('span', {}, ': ' + tn('Homescreen help script')),
                    elCreateText('span', {"class": ["mi"]}, 'add_to_home_screen')
                ])
            );
        }
        div.appendChild(ul);
        cardContainer.appendChild(div);
        return;
    }
    for (let i = 0; i < obj.result.returnedEntities; i++) {
        const col = elCreateEmpty('div', {"class": ["col", "px-0", "flex-grow-0"]});
        const homeType = typeFriendly[obj.result.data[i].options[0]];
        
        const card = elCreateEmpty('div', {"class": ["card", "home-icons"], "tabindex": 0, "draggable": "true",
            "title": tn(homeType) + ': ' + obj.result.data[i].name});
        if (obj.result.data[i].options[0] === 'album'){
            //AlbumArtist must be an array
            obj.result.data[i].options[1] = JSON.parse(obj.result.data[i].options[1]);
        }
        setData(card, 'data-href', {"cmd": obj.result.data[i].cmd, "options": obj.result.data[i].options});
        setData(card, 'data-pos', i);
        const cardBody = elCreateText('div', {"class": ["card-body", "mi", "rounded", "clickable"]}, obj.result.data[i].ligature);
        if (obj.result.data[i].image !== '') {
            cardBody.style.backgroundImage = 'url("' + subdir + '/pics/' + myEncodeURI(obj.result.data[i].image) + '")';
        }
        if (obj.result.data[i].bgcolor !== '') {
            cardBody.style.backgroundColor = obj.result.data[i].bgcolor;
        }
        if (obj.result.data[i].color !== '' && obj.result.data[i].color !== undefined) {
            cardBody.style.color = obj.result.data[i].color;
        }
        card.appendChild(cardBody);
        card.appendChild(elCreateText('div', {"class": ["card-footer", "card-footer-grid", "p-2", "clickable"]}, obj.result.data[i].name));
        col.appendChild(card);
        if (i < cols.length) {
            cols[i].replaceWith(col);
        }
        else {
            cardContainer.append(col);
        }
    }
    for (let i = cols.length - 1; i >= obj.result.returnedEntities; i--) {
        cols[i].remove();
    }
}

function popoverMenuHome(event) {
    event.target.parentNode.classList.add('selected');
    showPopover(event);
    event.preventDefault();
    event.stopPropagation();
}

function dragAndDropHome() {
    const HomeList = document.getElementById('HomeList');

    HomeList.addEventListener('dragstart', function(event) {
        if (event.target.classList.contains('home-icons')) {
            event.target.classList.add('opacity05');
            event.dataTransfer.setDragImage(event.target, 0, 0);
            event.dataTransfer.effectAllowed = 'move';
            dragSrc = event.target;
            dragEl = event.target.cloneNode(true);
        }
    }, false);

    HomeList.addEventListener('dragleave', function(event) {
        event.preventDefault();
        if (dragEl.classList.contains('home-icons') === false) {
            return;
        }
        if (event.target.nodeName === 'DIV' && event.target.classList.contains('home-icons')) {
            event.target.classList.remove('dragover-icon');
        }
    }, false);

    HomeList.addEventListener('dragover', function(event) {
        event.preventDefault();
        if (dragEl.classList.contains('home-icons') === false) {
            return;
        }
        const ths = HomeList.getElementsByClassName('dragover-icon');
        for (const th of ths) {
            th.classList.remove('dragover-icon');
        }
        if (event.target.nodeName === 'DIV' && event.target.classList.contains('home-icons')) {
            event.target.classList.add('dragover-icon');
        }
        else if (event.target.nodeName === 'DIV' && event.target.parentNode.classList.contains('home-icons')) {
            event.target.parentNode.classList.add('dragover-icon');
        }
        event.dataTransfer.dropEffect = 'move';
    }, false);

    HomeList.addEventListener('dragend', function(event) {
        event.preventDefault();
        if (dragEl.classList.contains('home-icons') === false) {
            return;
        }
        const ths = HomeList.getElementsByClassName('dragover-icon');
        for (const th of ths) {
            th.classList.remove('dragover-icon');
        }
        dragSrc.classList.remove('opacity05');
    }, false);

    HomeList.addEventListener('drop', function(event) {
        event.preventDefault();
        event.stopPropagation();
        if (dragEl.classList.contains('home-icons') === false) {
            return;
        }
        let dst = event.target;
        if (dst.nodeName === 'DIV') {
            if (dst.classList.contains('card-body')) {
                dst = dst.parentNode;
            }
            if (dst.classList.contains('home-icons')) {
                dragEl.classList.remove('opacity05');
                const to = getData(dst, 'data-pos');
                const from = getData(dragSrc, 'data-pos');
                if (isNaN(to) === false && isNaN(from) === false && from !== to) {
                    sendAPI("MYMPD_API_HOME_ICON_MOVE", {"from": from, "to": to}, function(obj) {
                        parseHome(obj);
                    });
                }
            }
        }
        const ths = HomeList.getElementsByClassName('dragover-icon');
        for (const th of ths) {
            th.classList.remove('dragover-icon');
        }
    }, false);
}

function populateHomeIconCmdSelect(type) {
    const selectHomeIconCmd = document.getElementById('selectHomeIconCmd');
    elClear(selectHomeIconCmd);
    if (type === 'view') {
        selectHomeIconCmd.appendChild(elCreateText('option', {"value": "appGoto"}, tn('Goto view')));
        setData(selectHomeIconCmd.lastChild, 'data-options', {"options": ["App", "Tab", "View", "Offset", "Limit", "Filter", "Sort", "Tag", "Search"]});
    }
    else if (type === 'script') {
        selectHomeIconCmd.appendChild(elCreateText('option', {"value": "execScriptFromOptions"}, tn('Execute Script')));
        setData(selectHomeIconCmd.lastChild, 'data-options', {"options":["Script", "Arguments"]});
    }
    else if (type === 'album') {
        selectHomeIconCmd.appendChild(elCreateText('option', {"value": "replaceQueueAlbum"}, tn('Replace queue')));
        setData(selectHomeIconCmd.lastChild, 'data-options', {"options": ["Type", "Albumartist", "Album"]});
        if (features.featWhence === true) {
            selectHomeIconCmd.appendChild(elCreateText('option', {"value": "insertQueueAlbum"}, tn('Insert after current playing song')));
            setData(selectHomeIconCmd.lastChild, 'data-options', {"options": ["Type", "Albumartist", "Album"]});
            selectHomeIconCmd.appendChild(elCreateText('option', {"value": "playQueueAlbum"}, tn('Add to queue and play')));
            setData(selectHomeIconCmd.lastChild, 'data-options', {"options": ["Type", "Albumartist", "Album"]});
        }
        selectHomeIconCmd.appendChild(elCreateText('option', {"value": "appendQueueAlbum"}, tn('Append to queue')));
        setData(selectHomeIconCmd.lastChild, 'data-options', {"options": ["Type", "Albumartist", "Album"]});
    }
    else {
        selectHomeIconCmd.appendChild(elCreateText('option', {"value": "replaceQueue"}, tn('Replace queue')));
        setData(selectHomeIconCmd.lastChild, 'data-options', {"options": ["Type", "Uri"]});
        if (features.featWhence === true) {
            selectHomeIconCmd.appendChild(elCreateText('option', {"value": "insertAfterCurrentQueue"}, tn('Insert after current playing song')));
            setData(selectHomeIconCmd.lastChild, 'data-options', {"options": ["Type", "Uri"]});
            selectHomeIconCmd.appendChild(elCreateText('option', {"value": "insertAndPlayQueue"}, tn('Add to queue and play')));
            setData(selectHomeIconCmd.lastChild, 'data-options', {"options": ["Type", "Uri"]});
        }
        selectHomeIconCmd.appendChild(elCreateText('option', {"value": "appendQueue"}, tn('Append to queue')));
        setData(selectHomeIconCmd.lastChild, 'data-options', {"options": ["Type", "Uri"]});
    }
}

//eslint-disable-next-line no-unused-vars
function executeHomeIcon(pos) {
    const el = document.getElementById('HomeList').children[pos].firstChild;
    parseCmd(null, getData(el, 'data-href'));
}

//eslint-disable-next-line no-unused-vars
function addViewToHome() {
    _addHomeIcon('appGoto', '', 'preview', [app.current.card, app.current.tab, app.current.view, 
        app.current.offset, app.current.limit, app.current.filter, app.current.sort, app.current.tag, app.current.search]); 
}

//eslint-disable-next-line no-unused-vars
function addScriptToHome(name, script) {
    const options = [script.script, script.arguments.join(',')];
    _addHomeIcon('execScriptFromOptions', name, 'code', options);
}

//eslint-disable-next-line no-unused-vars
function addPlistToHome(uri, type, name) {
    _addHomeIcon('replaceQueue', name, 'list', [type, uri]);
}

//eslint-disable-next-line no-unused-vars
function addDirToHome(uri, name) {
    _addHomeIcon('replaceQueue', name, 'folder_open', ['dir', uri]);
}

//eslint-disable-next-line no-unused-vars
function addSongToHome(uri, name) {
    _addHomeIcon('replaceQueue', name, 'music_note', ['song', uri]);
}

//eslint-disable-next-line no-unused-vars
function addSearchToHome() {
    _addHomeIcon('replaceQueue', tn('Current search'), 'saved_search', ['search', app.current.search]);
}

//eslint-disable-next-line no-unused-vars
function addAlbumToHome(albumArtist, album) {
    if (albumArtist === undefined) {
        album = app.current.tag;
        albumArtist = app.current.search;
    }
    _addHomeIcon('replaceQueueAlbum', album, 'album', ['album', JSON.stringify(albumArtist), album]);
}

//eslint-disable-next-line no-unused-vars
function addStreamToHome() {
    const mode = getRadioBoxValueId('addToPlaylistPos');
    const uri = document.getElementById('streamUrl').value;
    let action;
    switch(mode) {
        case 'append': action = 'appendQueue'; break;
        case 'insert': action = 'insertAfterCurrentQueue'; break;
        case 'play': action = 'insertAndPlayQueue'; break;
        case 'replace': action = 'replaceQueue'; break;
    }
    _addHomeIcon(action, '', 'stream', ['stream', uri]);
}

function _addHomeIcon(cmd, name, ligature, options) {
    document.getElementById('modalEditHomeIconTitle').textContent = tn('Add to homescreen');
    document.getElementById('inputHomeIconReplace').value = 'false';
    document.getElementById('inputHomeIconOldpos').value = '0';
    document.getElementById('inputHomeIconName').value = name;
    document.getElementById('inputHomeIconLigature').value = ligature;
    document.getElementById('inputHomeIconBgcolor').value = '#28a745';
    document.getElementById('inputHomeIconColor').value = '#ffffff';
    
    populateHomeIconCmdSelect(options[0]);
    document.getElementById('selectHomeIconCmd').value = cmd;
    showHomeIconCmdOptions(options);
    getHomeIconPictureList('');
    
    document.getElementById('homeIconPreview').textContent = ligature;
    document.getElementById('homeIconPreview').style.backgroundColor = '#28a745';
    document.getElementById('homeIconPreview').style.color = '#ffffff';
    document.getElementById('homeIconPreview').style.backgroundImage = '';
    elShowId('divHomeIconLigature');
    uiElements.modalEditHomeIcon.show();
}

//eslint-disable-next-line no-unused-vars
function duplicateHomeIcon(pos) {
    _editHomeIcon(pos, false, "Duplicate home icon");
}

//eslint-disable-next-line no-unused-vars
function editHomeIcon(pos) {
    _editHomeIcon(pos, true, "Edit home icon");
}

function _editHomeIcon(pos, replace, title) {
    document.getElementById('modalEditHomeIconTitle').textContent = tn(title);
    sendAPI("MYMPD_API_HOME_ICON_GET", {"pos": pos}, function(obj) {
        document.getElementById('inputHomeIconReplace').value = replace;
        document.getElementById('inputHomeIconOldpos').value = pos;
        document.getElementById('inputHomeIconName').value = obj.result.data.name;
        document.getElementById('inputHomeIconLigature').value = obj.result.data.ligature;
        document.getElementById('inputHomeIconBgcolor').value = obj.result.data.bgcolor;
        document.getElementById('inputHomeIconColor').value = obj.result.data.color;
        document.getElementById('selectHomeIconCmd').value = obj.result.data.cmd;

        populateHomeIconCmdSelect(obj.result.data.options[0]);
        showHomeIconCmdOptions(obj.result.data.options);
        getHomeIconPictureList(obj.result.data.image);

        document.getElementById('homeIconPreview').textContent = obj.result.data.ligature;
        document.getElementById('homeIconPreview').style.backgroundColor = obj.result.data.bgcolor;
        document.getElementById('homeIconPreview').style.color = obj.result.data.color;
        
        if (obj.result.data.image === '') {
            elShowId('divHomeIconLigature');
            document.getElementById('homeIconPreview').style.backgroundImage = '';
        }
        else {
            elHideId('divHomeIconLigature');
            document.getElementById('homeIconPreview').style.backgroundImage = 'url(' + subdir + '"/pics/' + myEncodeURI(obj.result.data.image) + '")';
        }
        //reset ligature selection
        document.getElementById('searchHomeIconLigature').value = '';
        document.getElementById('searchHomeIconCat').value = 'all';
        filterHomeIconLigatures();
        //show modal
        hideModalAlert();
        uiElements.modalEditHomeIcon.show();
    });
}

//eslint-disable-next-line no-unused-vars
function saveHomeIcon() {
    let formOK = true;
    const nameEl = document.getElementById('inputHomeIconName');
    if (!validateNotBlank(nameEl)) {
        formOK = false;
    }
    if (formOK === true) {
        const options = [];
        const optionEls = document.getElementById('divHomeIconOptions').getElementsByTagName('input');
        for (const optionEl of optionEls) {
            options.push(optionEl.value);
        }
        const image = getSelectValueId('selectHomeIconImage');
        sendAPI("MYMPD_API_HOME_ICON_SAVE", {
            "replace": (document.getElementById('inputHomeIconReplace').value === 'true' ? true : false),
            "oldpos": Number(document.getElementById('inputHomeIconOldpos').value),
            "name": nameEl.value,
            "ligature": (image === '' ? document.getElementById('inputHomeIconLigature').value : ''),
            "bgcolor": document.getElementById('inputHomeIconBgcolor').value,
            "color": document.getElementById('inputHomeIconColor').value,
            "image": image,
            "cmd": document.getElementById('selectHomeIconCmd').value,
            "options": options
        }, saveHomeIconClose, true);
    }
}

function saveHomeIconClose(obj) {
    removeEnterPinFooter();
    if (obj.error) {
        showModalAlert(obj);
    }
    else {
        hideModalAlert();
        uiElements.modalEditHomeIcon.hide();
        sendAPI("MYMPD_API_HOME_LIST", {}, function(obj2) {
            parseHome(obj2);
        });
    }
}

//eslint-disable-next-line no-unused-vars
function deleteHomeIcon(pos) {
    sendAPI("MYMPD_API_HOME_ICON_RM", {"pos": pos}, function(obj) {
        parseHome(obj);
    });
}

function showHomeIconCmdOptions(values) {
    const oldOptions = [];
    const optionEls = document.getElementById('divHomeIconOptions').getElementsByTagName('input');
    for (const optionEl of optionEls) {
        oldOptions.push(optionEl.value);
    }
    const divHomeIconOptions = document.getElementById('divHomeIconOptions');
    elClear(divHomeIconOptions);
    const options = getSelectedOptionDataId('selectHomeIconCmd', 'data-options');
    if (options !== undefined) {
        for (let i = 0, j = options.options.length; i < j; i++) {
            const row = elCreateEmpty('div', {"class": ["mb-3", "row"]});
            row.appendChild(elCreateText('label', {"class": ["col-sm-4"]}, tn(options.options[i])));
            const div = elCreateEmpty('div', {"class": ["col-sm-8"]});
            let value = values !== undefined ? values[i] !== undefined ? values[i] : '' : '';
            if (value === '' && oldOptions[i] !== undefined) {
                value = oldOptions[i];
            }
            div.appendChild(elCreateEmpty('input', {"class": ["form-control", "border-secondary"], "name": options.options[i], "value": value}));
            row.appendChild(div);
            divHomeIconOptions.appendChild(row);
        }
    }
}

function getHomeIconPictureList(picture) {
    getImageList('selectHomeIconImage', picture, [{"value": "", "text": "Use ligature"}]);
}
