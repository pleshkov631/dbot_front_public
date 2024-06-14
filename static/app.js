$.ajaxSetup({async: false});

tg = window.Telegram.WebApp;
tg.expand();
tg.enableClosingConfirmation();

let app = $('#webapp');
const urlParams = new URLSearchParams(window.location.search);
const bot_id = urlParams.get('bot_id');
const init_route = urlParams.get('route');
const stand = urlParams.get('stand');

let STAND = stand || 'prod';
if (init_route) {
    app.attr('data-route', init_route);
}

let chat_id = tg.initDataUnsafe.user.id;
let DADATA_TOKEN = '2205e54d460592a4c79a48a8bfa1f7ca64257a17';

let API_HOST = 'https://stage.api.dbot.inmonit.com';

let menuData = null;
let headersData = {
    'init-data': tg.initData,
    'telegram-bot-id': bot_id,
};

let cartData = null;
let cartDataObj = null;
let filiationData = null;

let defaultCurrency = '₽';
let methodPaymentData = {
    'CARD': {
        name: 'Картой при получении',
        id: 'CARD',
    },
    'CASH': {
        name: 'Наличными',
        id: 'CASH',
    },
    'YOOKASSA': {
        name: 'Онлайн-оплата',
        id: 'YOOKASSA',
    },
};
let orderStatus = {
    'PAYMENT': 'Ожидание оплаты',
    'CREATED': 'В очереди',
    'ACCEPTED': 'Принят',
    'COOKING': 'Готовится',
    'COOKED': 'Готовится',
    'DELIVERY': 'В пути',
    'DISCARDED': 'Отменен',
    'ERROR': 'Ошибка',
    'CLOSED': 'Завершен',
};
let dayI18nMap = {
    'monday': 'Понедельник',
    'tuesday': 'Вторник',
    'wednesday': 'Среда',
    'thursday': 'Четверг',
    'friday': 'Пятница',
    'saturday': 'Суббота',
    'sunday': 'Воскресенье',
};
let methodPayments = {};


function get_item(id) {
    for (let category of menuData) {
        for (let menu_item of category.items) {
            if (parseInt(menu_item.id) === parseInt(id)) {
                return menu_item;
            }
        }
    }
    return null;
}

function get_item_in_cart(id, modifier_id) {
    let withoutModifier = isNaN(parseInt(modifier_id))
    for (let cartItem of cartData) {
        if (cartItem.item_id === parseInt(id) && (withoutModifier || cartItem.modifier_id === parseInt(modifier_id))) {
            return cartItem;
        }
    }
    return false;
}

function gen_html_cart() {
    let html = `<table>`;

    for (let cartItem of cartData) {
        if (cartItem.count <= 0) {
            continue;
        }

        html += `
            <tr class="elemList" data-cart="${cartItem.cart_item_id}">
                <td width="90">
                    <picture>
                        <img class="ajaxLink" data-ajax='{"route":"iProduct","id":${cartItem.item_id}}' loading="lazy" src="${cartItem.photo_url}">
                    </picture>
                </td>
                <td>
                    <div class="name">${cartItem.item_name}</div>
                    <div class="desc"> ${cartItem.modifier_id != null ? cartItem.modifier_name : ''}</div>
                    <div class="groupBtnBasket">
                        <button class="listControl" data-action="minus">-</button>
                        <input type="text" readonly value="${cartItem.count}">
                        <button class="listControl" data-action="plus">+</button>
                    </div>
                </td>
                <td width="90" class="price"><span>${cartItem.full_cost}</span> ${defaultCurrency}</td>
            </tr>
            <tr class="supportElemList" data-cart="${cartItem.cart_item_id}">
                <td class="hr" colspan="3"></td>
            </tr>
        `;
    }
    html += '</table>';
    return html
}

function get_or_reload_cart(
    btnSpace = null,
    return_full_obj = false,
    product_id = null,
    product_modifier_id = undefined,
    update_main_button = true,
    main_button_prefix = 'Корзина ',
) {
    let id_product = parseInt(product_id);
    $.ajax({
        url: `${API_HOST}/api/v1/external/cart`,
        method: 'get',
        headers: headersData,
        dataType: 'json',
        success: function(data) {
            let cart_item_info = null;
            if (btnSpace) {
                let html = '';
                for (let item_data of data.cart_items) {
                    if (item_data.item_id === id_product && item_data.modifier_id === product_modifier_id) {
                        cart_item_info = item_data;
                        if (item_data.count > 0) {
                            html = `
                                <div data-cart="${data.cart_id}" data-cart-item="${item_data.cart_item_id}"  data-product="${id_product}"  data-product-modifier="${product_modifier_id}" class="groupBtn">
                                    ${(item_data.modifiers === undefined || item_data.modifiers === null || item_data.modifiers.length <= 0)
                                        ? `<button class="listControl" data-action="minus">-</button>
                                           <input type="text" readonly="" value="${item_data.count}">
                                           <button class="listControl" data-action="plus">+</button>`
                                        : `<input type="text" readonly="" value="${item_data.count}">`
                                    }
                                </div>
                            `;
                        }

                        if (item_data.count <= 0) {
                            html += `${(item.modifiers === null || item.modifiers.length <=0)
                                ? `<button data-id="${item.id}" class="listAddToCart">${item.item_cost} ${defaultCurrency}</button>`
                                : `<button data-ajax='{"route":"iProduct","id":${item.id}}' class="ajaxLink">${item.item_cost} ${defaultCurrency}</button>`
                            }`
                        }
                    }
                }
                if (cart_item_info === null && id_product) {
                    item_data = get_item(id_product);
                    html = `
                        <button data-id="${id_product}" class="listAddToCart">${item_data.item_cost} ${defaultCurrency}</button>
                    `;
                }
                if(btnSpace) {
                    btnSpace.html(html);
                }
            }
            cartDataObj = data;
            cartData = data.cart_items;
            if (update_main_button) {
                tg.MainButton.text = main_button_prefix +parseFloat(data.amount).toFixed(2) + ' ' + defaultCurrency;
                tg.MainButton.hideProgress(function() {});
                tg.MainButton.show();
            }
        },
        error: function() {
            console.log('error get basket');
        },
    });
    if (return_full_obj === true) {
        return cartDataObj;
    }
    return cartData;
}

function get_filiation_info() {
    $.ajax({
        url: `${API_HOST}/api/v1/external/filiation/info`,
        method: 'get',
        headers: headersData,
        dataType: 'json',
        success: function(data) {
            filiationData = data;
            init();
        },
        error: function() {
            console.log('error get filiation info');
        },
    });

    return filiationData;
}

if (color_btn) {
    tg.MainButton.color = color_btn;
}

if (color_text_btn) {
    tg.MainButton.textColor = color_text_btn;
}

const Application = {

    getICatalog() {
        tg.BackButton.hide();
        tg.MainButton.text = 'Корзина ';

        let dataAjax = {
            'route': 'iCart',
        };

        app.attr({
            'class': 'iCatalog',
            'data-back': '',
            'data-btn': JSON.stringify(dataAjax),
        });
        get_or_reload_cart();
        $.ajax({
            url: `${API_HOST}/api/v1/external/filiation/menu`,
            method: 'get',
            dataType: 'json',
            headers: headersData,
            crossDomain: true,
            beforeSend: function() {
                app.html('<div class="preloader"><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style="margin: auto; background: none; display: block; shape-rendering: auto;" width="200px" height="200px" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid"><path d="M36 50A14 14 0 0 0 64 50A14 15.3 0 0 1 36 50" fill="#e15b64" stroke="none"><animateTransform attributeName="transform" type="rotate" dur="1s" repeatCount="indefinite" keyTimes="0;1" values="0 50 50.65;360 50 50.65"></animateTransform></path></svg></div>');
            },
            success: function(resp_data) {
                let html = '';
                menuData = resp_data.menuCategories;
                html += `
                    <div class="navigation">
                        <div class="main-gallery">
                `;
                for (let category of resp_data.menuCategories) {
                    html += `
                        <div class="gallery-cell">
                            <a class="gallery-cell active" href="#cat_${category.id}">${category.name}</a>
                        </div>
                    `
                }
                html += '</div><div class="hr"></div></div><div class="container">'

                for (let category of resp_data.menuCategories) {
                    html += `
                        <h2 class="" >${category.name}</h2>
                        <div id="cat_${category.id}" class="row g-3 categoryElem">
                    `
                    for (let item of category.items) {

                        html += `
                            <div class="col-6">
                                <div id="elem_${item.id}" class="cardProduct position-relative h-100 incart">
                                    <picture data-ajax='{"route":"iProduct","id":${item.id}}' class="ajaxLink">
                                        <img loading="lazy" src="${item.photo_url}" />
                                    </picture>
                                    <h3 data-ajax='{"route":"iProduct","id":${item.id}}' class="ajaxLink">${item.name}</h3>
                                    <div class="btnEnable">
                                        <div class="btn-space position-absolute bottom-0">
                                        `
                                        if (item.count_in_cart > 0) {
                                            html+= `
                                                <div data-cart="${cartDataObj.cart_id}" data-cart-item="${item.cart_item_id}" data-product="${item.id}"  data-product-modifier="${item.modifier_id}" class="groupBtn">
                                                    ${(item.modifiers === null || item.modifiers.length <=0)
                                                        ? `<button class="listControl" data-action="minus">-</button>
                                                           <input type="text" readonly="" value="${item.count_in_cart}">
                                                           <button class="listControl" data-action="plus">+</button>`
                                                        : `<input type="text" readonly="" value="${item.count_in_cart}">`
                                                    }
                                                </div>
                                            `;
                                        }

                                        if (item.count_in_cart === undefined || item.count_in_cart <= 0) {
                                            html += `${(item.modifiers === null || item.modifiers.length <=0)
                                                ? `<button data-id="${item.id}" class="listAddToCart">${item.item_cost} ${defaultCurrency}</button>`
                                                : `<button data-ajax='{"route":"iProduct","id":${item.id}}' class="ajaxLink">${item.item_cost} ${defaultCurrency}</button>`
                                            }`
                                        }
                                        html += `
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        `
                    }
                    html +=  `
                    </div>
                    <div class="text-hint-container">
                      <div class="text-hint"><p>Минимальный заказ ${filiationData.minimal_amount}  ${defaultCurrency}</p></div>
                    </div>
                    `
                }
                app.html(html);

                getNavICatalog();

                let _scroll = app.attr('data-scroll');
                $('html,body').stop().animate({
                    scrollTop: _scroll
                }, 1);
                //e.preventDefault();

            },
            error: function(e) {
                console.log('error get iCatalog');
            }
        });

        function getNavICatalog() {
            flkty = new Flickity('.main-gallery',{
                cellAlign: 'center',
                contain: true,
                prevNextButtons: false,
                pageDots: false,
                dragThreshold: 10,
                accessibility: false,
            });
        }

        function getCurrentICatalogNav() {
            $('.categoryElem').each(function(i, elem) {
                if (getActiveICatalogNav('#' + $(this).attr('id'))) {

                    if (flkty.selectedIndex != i) {
                        let current = $(this).attr('id');
                        delActiveICatalogNav();
                        $('.navigation a[href="#' + current + '"]').addClass('active');
                        flkty.select(i);
                    }
                    //return false;

                }

            });
        }

        function delActiveICatalogNav() {
            $('.navigation a').each(function() {
                $(this).removeClass('active');
            })
        }

        function getActiveICatalogNav(target) {
            let w = $(window);
            let t = $(target);
            let wt = w.scrollTop();
            let wh = w.height() - tg.viewportHeight / 2;
            let eh = t.outerHeight();
            let et = t.offset().top;
            if (wt + wh >= et && wt + wh - eh * 2 <= et + (wh - eh)) {
                return true;
            } else {
                return false;
            }
        }

        function addToCartICatalog(product_id, product_modifier_id, btnSpace) {
            get_or_reload_cart(btnSpace, false, product_id, product_modifier_id);

            $.ajax({
                url: `${API_HOST}/api/v1/external/cart/cart_item`,
                method: 'post',
                contentType: "application/json",
                dataType: 'json',
                headers: headersData,
                data: JSON.stringify({
                    'item_id': product_id,
                    'item_modifier_id': product_modifier_id,
                    'count': 1,
                }),
                success: function(data) {
                    get_or_reload_cart(btnSpace, false, product_id, product_modifier_id);
                },
                error: function() {
                    console.log('error addToCartICatalog');
                }
            });
        }

        function editCartICatalog(id_cart_item, product_id, product_modifier_id, quantity, btnSpace) {
            let data = {
                count: quantity,
            };
            $.ajax({
                url: `${API_HOST}/api/v1/external/cart/cart_item/${id_cart_item}/count`,
                method: 'post',
                dataType: 'json',
                contentType: "application/json",
                headers: headersData,
                data: JSON.stringify(data),
                complete: function (xhr, text_status) {
                    if (xhr.status === 200) {
                        tg.MainButton.hideProgress(function() {});
                        get_or_reload_cart(btnSpace, false, product_id, product_modifier_id);
                    }
                },
                error: function(data) {}
            });
        }

        $('body').on('click', '.listAddToCart', function(e) {
            e.stopImmediatePropagation();
            tg.HapticFeedback.selectionChanged(function() {});
            let card = $(this).parents('.cardProduct');
            let product_id = $(this).attr('data-id');
            let product_modifier_id = $(this).attr('data-modifier-id');
            let btnSpace = $(this).parents('.btn-space');
            card.addClass('incart');

            addToCartICatalog(product_id, product_modifier_id, btnSpace);
        });

        $('body').on('click', '.groupBtn .listControl', function(e) {
            e.stopImmediatePropagation();
            tg.HapticFeedback.selectionChanged(function() {});
            let btn = $(this);
            let card = $(this).parents('.cardProduct');
            let action = btn.attr('data-action');
            let btnSpace = btn.parents('.btn-space');
            let id_cart_item = btn.parents('.groupBtn').attr('data-cart-item');
            let product_id = btn.parents('.groupBtn').attr('data-product');
            let product_modifier_id = btn.parents('.groupBtn').attr('data-product-modifier');
            product_modifier_id = product_modifier_id === 'undefined' ? undefined : product_modifier_id
            var value = btn.parents('.groupBtn').find('input').val();

            if (action === 'plus') {
                value = Number(value) + 1;
            } else {
                if (Number(value) > 0) {
                    value = Number(value) - 1;
                }
            }
            if (value === 0) {
                card.removeClass('incart');
            } else {
                btn.parents('.groupBtn').find('input').val(value);
            }

            editCartICatalog(id_cart_item, product_id, product_modifier_id ,value, btnSpace);
        });

        //for getICatalogNav()
        $("body").on('click', '[href*="#"]', function(e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            let fixed_offset = 100;
            tg.HapticFeedback.selectionChanged(function() {});
            //$(this).addClass('active');
            $('html,body').stop().animate({
                scrollTop: $(this.hash).offset().top - fixed_offset
            }, 100);
            //getCurrentICatalogNav();

        });

        $(window).scroll(function() {
            getCurrentICatalogNav();
        });

    },


    getIProduct(id) {
        tg.BackButton.show();
        tg.MainButton.hide(function() {});

        let dataAjax = {
            'route': 'iCatalog',
        }

        app.attr({
            'class': 'iProduct',
            'data-back': JSON.stringify(dataAjax),
        })

        let data = {
            id: id,
            chat_id: chat_id,
        };
        catalog_item = get_item(id);
        let withoutModifiers = catalog_item.modifiers === null || catalog_item.modifiers.length <= 0
        let html = '';

        function gen_html_variables(id) {
            catalog_item = get_item(id);
            let html = ``;
            if (withoutModifiers) {
                return html;
            }

            html += `
                <h4 class="variable_title">Дополнительно</h4>
                <div class="variable" id="attr">
                    <div class="variable" id="attr">
                        <div class="form_radio_btn">
            `;

            catalog_item.modifiers.forEach((modifier, index) => {
                html += `
                    <input data-price="${modifier.cost}" id-product-modifier="${modifier.id}" type="radio" name="radio" data-value="${modifier.name}" value="${modifier.id}">
                    <label class="${ index === 0 ? 'first-child' : ''}" for="${modifier.id}">${modifier.name}
                        ${modifier.cost <= 0 ? `<span>бесплатно</span>` : `<span>+${modifier.cost} ₽</span>`}
                    </label>
                `;
            });

            html += `</div></div></div>`;
            return html
        }

        html += `
            <div data-id="${catalog_item.id}" data-price ="${catalog_item.item_cost}" data-currency="${defaultCurrency}" class="product">
                <picture>
                    <div class="labels-product"></div>
                    <img src="${catalog_item.photo_url}" alt=""/>
                </picture>
                <h3>${catalog_item.name}</h3>
                ${catalog_item.description ?
                    '<div class="desc"><p>' + catalog_item.description + '</p></div>'
                : ''}
                ${catalog_item.ingredients ?
                    '<div class="desc"><p>' + catalog_item.ingredients + '</p></div>'
                : ''}
                ${gen_html_variables(id)}
                <div class="notification d-none">
                    <table>
                        <thead>
                            <tr>
                                <th width="80%">В корзине</th>
                                <th width="20%">Кол-во</th>
                            </tr>
                        </thead>
                        <tbody></tbody>
                    </table>
                </div>
                <div class="footer_sticky">
                    <div class="hr"></div>
                    <div class="quantity">
                        <div class="row">
                            <div class="col-6">
                                <div class="input-group">
                                    <button data-action="minus" class="btn btn-outline-secondary" type="button">-</button>
                                    <input value="1" readonly type="text" class="form-control" placeholder="" aria-label="">
                                    <button data-action="plus" class="btn btn-outline-secondary" type="button">+</button>
                                </div>
                            </div>
                            <div class="col-6">
                                <button ${withoutModifiers ? `` : `disabled="disabled"`} data-price="${catalog_item.item_cost}" id="addToCart" class="btn btn-outline-secondary" type="button">Добавить ${catalog_item.item_cost} ${defaultCurrency}</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="container"></div>
        `;
        /* блок с уже имеющимися в корзине
            <div class="notification">
                <table>
                    <thead>
                        <tr>
                            <th width="90%">\u0412 \u043a\u043e\u0440\u0437\u0438\u043d\u0435</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>
                                \u0421\u0432\u0438\u043d\u044b\u0435 \u0440\u0435\u0431\u0440\u0430 \u0432 \u043f\u0438\u0432\u043d\u043e\u0439 \u0433\u043b\u0430\u0437\u0443\u0440\u0438 \u0441 \u0441\u0430\u043b\u0430\u0442\u043e\u043c \u0438 \u0441\u043e\u0443\u0441\u043e\u043c \u0421\u0430\u043b\u044c\u0441\u0430
                                <br>
                                <span class="text-hint"></span>
                            </td>
                            <td>
                                <span class="text-bold">1 \u0448\u0442</span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        */
        app.html(html);

        function addIProduct() {
            let id = $('.product').attr('data-id');
            let quantity = $('.quantity input').val();
            let price = $('#addToCart').attr('data-price');

            let variable = '';
            if ($('#variable').length) {
                variable = {
                    'id': $('#variable input[name="radio"]:checked').val(),
                    'name': $('#variable input[name="radio"]:checked').attr('data-value'),
                };
            }


            let attr = {};
            if ($('#attr').length) {
                $('#attr input:radio:checked').each(function() {
                    attr = {
                        'id': $(this).val(),
                        'name': $(this).attr('data-value')
                    };
                });
            }
            if(!withoutModifiers && attr === {}) {
                return;
            }

            let data = {
                item_id: id,
                count: quantity,
                item_modifier_id: attr['id'],
            };

            get_or_reload_cart();
            let cartItem = get_item_in_cart(id, data.item_modifier_id);
            if (cartItem) {
                data.count = parseInt(data.count)+parseInt(cartItem.count);
                $.ajax({
                    url: `${API_HOST}/api/v1/external/cart/cart_item/${cartItem.cart_item_id}/count`,
                    method: 'post',
                    dataType: 'json',
                    contentType: "application/json",
                    headers: headersData,
                    data: JSON.stringify(data),
                    success: function(data) {
                        tg.MainButton.hideProgress(function() {});
                        if (data.html != null) {
                            btnSpace.html(data.html);
                        }
                        get_or_reload_cart();
                    },
                    error: function(data) {

                    }
                });
            } else {
                $.ajax({
                    url: `${API_HOST}/api/v1/external/cart/cart_item`,
                    method: 'post',
                    contentType: 'application/json',
                    dataType: 'json',
                    headers: headersData,
                    data: JSON.stringify(data),
                    success: function(data) {
                        route = {
                            'route': 'iCatalog',
                        };
                        Application.route(route);
                    },
                    error: function() {
                        console.log('error add product');
                    }
                });
            }
        }

        function calcPriceProduct() {
            var value = $('.quantity .input-group input').val();
            if ($('#variable').length) {
                let price = $('#variable input[name="radio"]:checked').attr('data-price');
                $('.product').attr('data-price', price);
                let description = $('#variable input[name="radio"]:checked').attr('data-description');
                $('.variable_description').html(description);
            }

            let price_attr = 0;
            if ($('#attr').length) {
                let checkedValues = $('#attr input:radio:checked');
                checkedValues.each(function() {
                    price_attr = Number(price_attr) + Number($(this).attr('data-price'));
                });
                if (checkedValues.length) {
                    $('#addToCart').removeAttr("disabled")
                } else {
                    $('#addToCart').attr("disabled", "disabled");
                }
            }
            let dataPrice = $('.product').attr('data-price');
            let currency = $('.product').attr('data-currency');

            let price = Number(dataPrice) * Number(value);
            price = Number(price_attr) * Number(value) + Number(price);
            $('#addToCart').text('Добавить ' + price + ' ' + currency);
        }

        $('body').on('click', '#addToCart', function(e) {
            e.stopImmediatePropagation();
            tg.HapticFeedback.notificationOccurred('success');
            let self = $(this);
            self.addClass("activeBtn");
            setTimeout(function() {
                self.removeClass("activeBtn");
            }, 200);
            addIProduct();
        })

        $('body').on('click', '.form_radio_btn label', function(e) {
            e.stopImmediatePropagation();
            let label = $(this);
            tg.HapticFeedback.selectionChanged(function() {});
            label.parents('.form_radio_btn').find(`input[value="${label.attr('for')}"]`).click();
        });

        $('body').on('click', '.quantity .input-group button', function(e) {
            e.stopImmediatePropagation();
            let self = $(this);

            let action = $(this).attr('data-action');
            let value = $('.quantity .input-group input').val();
            if (action == 'plus') {
                tg.HapticFeedback.selectionChanged(function() {});
                value = Number(value) + 1;
            } else {
                if (Number(value) > 1) {
                    tg.HapticFeedback.selectionChanged(function() {});
                    value = Number(value) - 1;
                } else {
                    tg.HapticFeedback.notificationOccurred('error');
                }
            }
            self.addClass("activeBtn");
            setTimeout(function() {
                self.removeClass("activeBtn");
            }, 200);
            $('.quantity .input-group input').val(value);
            calcPriceProduct();
        });
        calcPriceProduct();
        $('body').on('change', '#variable input', function(e) {
            e.stopImmediatePropagation();
            tg.HapticFeedback.selectionChanged(function() {});
            calcPriceProduct();
        });

        $('body').on('change', '#attr input', function(e) {
            e.stopImmediatePropagation();
            tg.HapticFeedback.selectionChanged(function() {});
            calcPriceProduct();
        });
    },

    // repeatOrder(id) {
    //     let data = {
    //         chat_id: chat_id,
    //         id: id,
    //     };
    //
    //     $.ajax({
    //         url: '/webapp/ajax/repeat',
    //         method: 'post',
    //         dataType: 'json',
    //         data: data,
    //         beforeSend: function() {
    //             app.html('<div class="preloader"><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style="margin: auto; background: none; display: block; shape-rendering: auto;" width="200px" height="200px" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid"><path d="M36 50A14 14 0 0 0 64 50A14 15.3 0 0 1 36 50" fill="#e15b64" stroke="none"><animateTransform attributeName="transform" type="rotate" dur="1s" repeatCount="indefinite" keyTimes="0;1" values="0 50 50.65;360 50 50.65"></animateTransform></path></svg></div>');
    //         },
    //         success: function(data) {
    //         },
    //         error: function(e) {
    //             console.log('error add product');
    //         }
    //     });
    //
    // },

    getICart() {
        tg.BackButton.show();
        tg.MainButton.hide();
        if (filiationData.stopped === true) {
            tg.showPopup({message:"Сейчас не работаем"});
            Application.getICatalog();
            return;
        }
        tg.MainButton.text = 'Оформить заказ';
        let dataAjax = {
            'route': 'iCatalog',
        }
        var dataAjaxBtn = {
            'route': 'iOrder',
        }

        app.attr({
            'class': 'iCart',
            'data-back': JSON.stringify(dataAjax),
            'data-btn': JSON.stringify(dataAjaxBtn),
        })

        let data = {
            chat_id: chat_id,
        };

        // $.ajax({
        //     url: '/webapp/ajax/cart',
        //     method: 'post',
        //     dataType: 'json',
        //     data: data,
        //     beforeSend: function() {
        //         app.html('<div class="preloader"><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style="margin: auto; background: none; display: block; shape-rendering: auto;" width="200px" height="200px" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid"><path d="M36 50A14 14 0 0 0 64 50A14 15.3 0 0 1 36 50" fill="#e15b64" stroke="none"><animateTransform attributeName="transform" type="rotate" dur="1s" repeatCount="indefinite" keyTimes="0;1" values="0 50 50.65;360 50 50.65"></animateTransform></path></svg></div>');
        //     },
        //     success: function(data) {
        //         console.log(data.time);
        //         app.html(data.html);
        //         if (data.count != 0 && data.time) {
        //             tg.MainButton.show();
        //         }
        //
        //         if (data.show_notofication) {
        //             $('.notification_cart').removeClass('d-none');
        //             tg.MainButton.hide();
        //         }
        //
        //     },
        //     error: function(e) {
        //         console.log('error add product');
        //     }
        // });

//        if (!!cartData === false) {

        get_or_reload_cart(null, false, null, true, 'Оформить заказ ');
//        }

        app.html(gen_html_cart());
        tg.MainButton.show();
        function editCartICart(id_cart, value, card, btn) {
            $.ajax({
                url: `${API_HOST}/api/v1/external/cart/cart_item/${id_cart}/count`,
                method: 'post',
                dataType: 'json',
                contentType: "application/json",
                headers: headersData,
                data: JSON.stringify({
                    'count': value,
                }),
                success: function(data) {
                    btn.parents('.groupBtnBasket').children().removeAttr('disabled');
                    cartData = get_or_reload_cart(null, false, null, true, 'Оформить заказ ');
                    if (parseInt(cartData.amount) <= 0) {
                        app.html('<div class="alert-icon"><svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M27.2157 0.291034C21.0326 1.59672 16.3098 7.4918 15.8852 14.4338L15.7849 16.0741L13.1116 16.1276C10.6232 16.1775 10.3762 16.2104 9.53896 16.6038C8.40448 17.1368 7.52794 18.0092 7.02832 19.1026C6.54754 20.1549 6.58071 19.7454 5.58791 36.8682C4.82054 50.1031 4.81329 50.3151 5.08314 51.6285C5.91332 55.6696 9.07912 58.898 13.0352 59.7376C14.6868 60.0883 45.3148 60.087 46.9879 59.7363C50.8988 58.9164 54.0917 55.6572 54.9162 51.643C55.1814 50.3525 55.1725 50.0768 54.4944 38.4152C53.3858 19.352 53.4473 20.1381 52.9851 19.1266C52.475 18.0105 51.6053 17.1402 50.4635 16.6038C49.6262 16.2104 49.3792 16.1775 46.8908 16.1276L44.2175 16.0741L44.1172 14.4338C43.5474 5.1158 35.6522 -1.49069 27.2157 0.291034ZM32.1749 2.79125C32.7948 2.92095 33.9886 3.3665 34.828 3.78172C37.3979 5.05272 39.6079 7.57988 40.7012 10.4976C41.1749 11.7616 41.594 13.9854 41.594 15.2344V16.1005H30.0012H18.4084V15.2344C18.4084 11.707 20.0509 7.92719 22.619 5.54522C25.2363 3.11743 28.8092 2.08776 32.1749 2.79125ZM15.8322 20.5439C15.8322 22.3063 15.8535 22.4278 16.2275 22.8023C16.4766 23.0521 16.8067 23.1984 17.1203 23.1984C17.434 23.1984 17.7641 23.0521 18.0131 22.8023C18.3872 22.4278 18.4084 22.3063 18.4084 20.5439V18.6816H30.0012H41.594V20.5439C41.594 22.3063 41.6153 22.4278 41.9893 22.8023C42.2384 23.0521 42.5684 23.1984 42.8821 23.1984C43.1957 23.1984 43.5258 23.0521 43.7749 22.8023C44.1493 22.4275 44.1702 22.3071 44.1702 20.533V18.6593L46.7193 18.7108C49.2118 18.7611 49.2812 18.7721 49.8445 19.2031C50.1913 19.4683 50.52 19.9182 50.6699 20.3323C50.8584 20.8537 51.1231 24.5547 51.761 35.5888C52.4985 48.3432 52.5779 50.2799 52.3998 51.1444C51.8081 54.0145 49.5259 56.402 46.6591 57.1501C45.2348 57.5218 14.7676 57.5218 13.3433 57.1501C11.2111 56.5938 9.16606 54.9451 8.23896 53.0356C7.31604 51.1344 7.31589 51.5966 8.24138 35.5888C9.10697 20.6165 9.16284 20.0531 9.8407 19.4385C10.5685 18.7785 11.023 18.6835 13.4573 18.6825L15.8322 18.6816V20.5439Z" fill=""/></svg><span>Ваша корзина пуста</span></div>');
                    } else {
                        let cartItem = get_item_in_cart(data.item_id, data.item_modifier_id);
                        card.find('.price span').html(cartItem.full_cost);
                    }
                },
                error: function(data) {
                    cartData = get_or_reload_cart(null, false, null, true, 'Оформить заказ ');
                }
            });
        }

        $('body').on('click', '.groupBtnBasket .listControl', function(e) {
            e.stopImmediatePropagation();
            tg.HapticFeedback.selectionChanged(function() {});
            let btn = $(this);
            let card = $(this).parents('.elemList');
            let id = card.attr('data-cart');
            let action = btn.attr('data-action');

            let id_cart = card.attr('data-cart');
            var value = btn.parents('.groupBtnBasket').find('input').val();

            btn.parents('.groupBtnBasket').children().attr('disabled', 'disabled');
            if (action == 'plus') {
                value = Number(value) + 1;
            } else {
                value = Number(value) - 1;
                if (value <= 0) {
                    card.fadeOut(300);
                    $('.supportElemList[data-cart="' + id + '"]').fadeOut(300);
                }
            }
            if (value < 0) {
                value = 0;
            }

            btn.parents('.groupBtnBasket').find('input').val(value);
            editCartICart(id_cart, value, card, btn);
        });

    },

    getIOrder() {
        tg.BackButton.show();
        tg.MainButton.show(function() {});
        cartData = get_or_reload_cart(null, true, null, false);
        if (filiationData.minimal_amount > cartData.amount) {
            tg.showPopup({message:"Минимальная сумма заказа " + filiationData.minimal_amount + " " + defaultCurrency});
            Application.getICart();
            return;
        }
        tg.MainButton.text = 'Продолжить';
        let dataAjax = {
            'route': 'iCart',
        }

        app.attr({
            'class': 'iOrder',
            'data-back': JSON.stringify(dataAjax),
        })

        let html = `
            <h4 class="variable_title">Способ получения заказа</h4>
            <div class="variable" id="shipping">
        `
        methodPayments = {};

        for (let order_option of filiationData?.payment_options) {
            methodPayments[order_option.order_type] = []
            methodPayments[order_option.order_type].push(methodPaymentData[order_option.payment_method_type])
        }
        Object.entries(methodPayments).forEach(([delivery_type, options]) => {
            if (delivery_type == 'DELIVERY') {
                html += `
                <div class="form_radio_btn ">
                    <input id="Shipping" type="radio" name="shipping" value="${delivery_type}" data-value="1" checked>
                    <label for="Shipping">Доставка <span id="priceShipping"> ~ ${filiationData.delivery_duration}</span></label>
                </div>
                `
            }
            if (delivery_type == 'TAKE_AWAY') {
                html += `
                <div class="form_radio_btn ">
                    <input id="Pickup" type="radio" name="shipping" value="${delivery_type}" data-value="2">
                    <label for="Pickup">Самовывоз</label>
                </div>
                `
            }
            if (delivery_type == 'INSIDE') {
                html += `
                <div class="form_radio_btn ">
                    <input id="Place" type="radio" name="shipping" value="${delivery_type}" data-value="3">
                    <label for="Place">В заведении</label>
                </div>
                `
            }
        })
        html +=`
            </div>
            <h4 class="variable_title">Способ оплаты</h4>
            <div class="variable" id="payment"></div>
            <h4 class="variable_title">Информация</h4>
            <div class="gInput" id="phone">
                <input class="mask-phone" type="tel" placeholder="Номер телефона">
            </div>
            <div class="gInput d-none" data-coordinate="" id="address">
                <input class="" type="text" placeholder="Адрес доставки: ул. Мира 123, кв. 7">
                <div class="notificationInput"></div>
            </div>
            <div class="gInput" id="comment">
                <input class="" type="text" placeholder="Ваш комментарий: например, приборы на 3х человек">
            </div>
            <h4 class="variable_title">Сводка</h4>
            <div class="totalOrder">
            <div>
                Сумма
                <span id="productPrice"></span>
            </div>
            <div class="hr"></div>
            <div id="addressPrice" data-price="" class="d-none">Доставка
                <span>0 ${defaultCurrency}</span>
            </div>
            <div class="hr"></div>
            <div id="totalPriceOrder" data-price="" class="">Итого<span>-</span></div></div>
            <!--<div class="policy">Нажимая на кнопку “Продолжить” вы даете согласие на обработку и хранение персональных данных в соответствии с Политикой конфиденциальности и условиями. <span data-ajax='{"route":"iPolicy"}' class="ajaxLink">Подробнее</span></div>-->

        `
        app.html(html);

        if (filiationData.payment_strategy === 'FIXED') {
            updateDeliveryCost(filiationData.fixed_delivery_amount, defaultCurrency);
        }
        $('#productPrice').html(cartData.amount + ' ' + defaultCurrency);
        $('#totalPriceOrder span').html(cartData.amount + ' ' + defaultCurrency);
        getPayments();
        setAttr();


        function setAttr() {
            let payment = $('#payment input[name="payment"]:checked').val();
            // if (payment == 1) {
            //     newDataAjaxBtn = {
            //         'route': 'iPay',
            //     }
            // } else
            if (payment != 1) {
                newDataAjaxBtn = {
                    'route': 'iCreate',
                }
            }
            $('input').each(function() {
                $(this).removeClass('validateError');
            })
            app.attr('data-btn', JSON.stringify(newDataAjaxBtn));

        }

        function getPayments() {
            let shipping = $('#shipping input[name="shipping"]:checked').val();
            $('#payment').html('');
            $.each(methodPayments[shipping], function(i, elem) {
                var html = `<div class="form_radio_btn`;
                if (methodPayments[shipping].length == 1) {
                    html = html + ` form_radio_btn_one `;
                }
                html = html + `">
                        <input id="` + elem.id + `" type="radio" name="payment"`;
                if (i == 0) {
                    html = html + ` checked `;
                }
                html = html + `value="` + elem.id + `">
                        <label for="` + elem.id + `">` + elem.name + `</label>
                    </div>`;
                $('#payment').append(html);
            });

            if (shipping == 'DELIVERY') {
                $('#address').removeClass('d-none');
                $('#addressPrice').removeClass('d-none');
                $('#comment input').attr('placeholder', 'Ваш комментарий: например, приборы на 3х человек')
            } else if (shipping == 'INSIDE') {
                if (!$('#address').hasClass('d-none')) {
                    $('#address').addClass('d-none');
                }
                $('#comment input').attr('placeholder', 'Укажите номер столика')
            } else {
                if (!$('#address').hasClass('d-none')) {
                    $('#address').addClass('d-none');
                }
                if (!$('#addressPrice').hasClass('d-none')) {
                    $('#addressPrice').addClass('d-none');
                }
                $('#comment input').attr('placeholder', 'Ваш комментарий: например, приборы на 3х человек')

            }
            setAttr();
        }

        function getaddress(address) {
            cartData = get_or_reload_cart(null, true, null, false);
            let data = {
                filiation_id: filiationData.filiation_id,
                address: address,
                order_amount: cartData.amount,
                order_type: $('#shipping input[name="shipping"]:checked').attr('value'),
            };
            $.ajax({
                url: `${API_HOST}/api/v1/external/order/delivery/cost`,
                method: 'get',
                dataType: 'json',
                contentType: "application/json",
                headers: headersData,
                data: data,
                success: function(data) {
                    $('#address input').val(data.validated_address);
                    $('#address .notificationInput').html('');
                    tg.MainButton.show(function() {});
                    // $('#address').attr('data-coordinate', data.coordinates);
                    updateDeliveryCost(data.delivery_cost, defaultCurrency);
                    calcTotalOrderPrice();
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    if (jqXHR.status === 400) {
                        tg.showPopup({message: jqXHR.responseJSON.message});
                    }
                }
            });
        }

        function updateDeliveryCost(delivery_cost, defaultCurrency) {
            if (parseFloat(delivery_cost) != 0) {
                $('#addressPrice span').html(delivery_cost + ' ' + defaultCurrency);
                $('#addressPrice').attr('data-price', delivery_cost);
            } else {
                $('#addressPrice span').html('Бесплатно');
                $('#addressPrice').attr('data-price', 0);
            }
        }

        function calcTotalOrderPrice() {
            let discount_sum = 0;
            let order_sum = $('#productPrice').text();
            let delivery_sum = $('#addressPrice').attr('data-price');
            order_sum = order_sum.split(' ');
            // console.log('====')
            let total = Number(order_sum[0]) + Number(delivery_sum) - Number(discount_sum);

            $('#totalPriceOrder span').html(total + order_sum[1]);

            return total;
        }

        $('body').on('change', '#shipping input', function(e) {
            e.stopImmediatePropagation();
            tg.HapticFeedback.selectionChanged(function() {});
            getPayments();
            if (filiationData.payment_strategy === 'FIXED') {
                $('#addressPrice span').html('-');
            }
            $('#addressPrice').attr('data-price', 0);
            $('#address input').val('');
            // $('#address').attr('data-coordinate', '');
            tg.MainButton.show(function() {});

            calcTotalOrderPrice();

        });

        $('body').on('change', '#payment input', function(e) {
            e.stopImmediatePropagation();
            tg.HapticFeedback.selectionChanged(function() {});
            setAttr();
        });

        $('body').on('focus', 'input', function() {
            $(this).removeClass('validateError');
        })

        $('body').on('focus', '#address input', function() {
            $('#address .notificationInput').html('');
        });

        $('body').on('blur', '#address input', function() {
            let address = $(this).val();
            getaddress(address);
            console.log(address);
        });

        $("#address input").suggestions({
          token: DADATA_TOKEN,
          type: "address",
          onSelect: function(suggestion) {
            let address = suggestion.value;
            getaddress(address);
            console.log(address);
            }
        });
    },
    //
    // getIPolicy() {
    //     tg.BackButton.show();
    //     tg.MainButton.hide(function() {});
    //     //tg.MainButton.text = 'Продолжить';
    //     let dataAjax = {
    //         'route': 'iOrder',
    //     }
    //
    //     app.attr({
    //         'class': 'iPolicy',
    //         'data-back': JSON.stringify(dataAjax),
    //     })
    //
    //     let data = {
    //         chat_id: chat_id,
    //     };
    //
    //     $.ajax({
    //         url: '/webapp/ajax/policy',
    //         method: 'post',
    //         dataType: 'json',
    //         data: data,
    //         beforeSend: function() {
    //             app.html('<div class="preloader"><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style="margin: auto; background: none; display: block; shape-rendering: auto;" width="200px" height="200px" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid"><path d="M36 50A14 14 0 0 0 64 50A14 15.3 0 0 1 36 50" fill="#e15b64" stroke="none"><animateTransform attributeName="transform" type="rotate" dur="1s" repeatCount="indefinite" keyTimes="0;1" values="0 50 50.65;360 50 50.65"></animateTransform></path></svg></div>');
    //         },
    //         success: function(data) {
    //             app.html(data.html);
    //
    //         },
    //         error: function(e) {
    //             console.log('error add product');
    //         }
    //     });
    // },

    getIProfile() {
        //tg.BackButton.show();
        tg.MainButton.hide(function() {});
        //tg.MainButton.text = 'Продолжить';
        let dataAjax = {
            'route': 'iCatalog',
        }

        app.attr({
            'class': 'iProfile',
            'data-back': JSON.stringify(dataAjax),
        });

        let data = {
            chat_id: chat_id,
        };

        $.ajax({
            url: '/webapp/ajax/profile',
            method: 'post',
            dataType: 'json',
            data: data,
            beforeSend: function() {
                app.html('<div class="preloader"><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style="margin: auto; background: none; display: block; shape-rendering: auto;" width="200px" height="200px" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid"><path d="M36 50A14 14 0 0 0 64 50A14 15.3 0 0 1 36 50" fill="#e15b64" stroke="none"><animateTransform attributeName="transform" type="rotate" dur="1s" repeatCount="indefinite" keyTimes="0;1" values="0 50 50.65;360 50 50.65"></animateTransform></path></svg></div>');
            },
            success: function(data) {
                app.html(data.html);

            },
            error: function(e) {
                console.log('error add product');
            }
        });

    },

    getIContact() {

        let dataBtn = {
            'route': 'call',
        }

        tg.BackButton.hide();
        tg.MainButton.hide(function() {});
        //tg.MainButton.text = 'Позвонить';
        let dataAjax = {
            'route': 'iCatalog',
        }

        app.attr({
            'class': 'iContact',
            'data-back': JSON.stringify(dataAjax),
            'data-btn': JSON.stringify(dataBtn),
        });
        get_filiation_info();
        map_render = false;
        let html = `
            <script>
                ymaps.ready(init);
                function init() {
                    if (map_render) {
                        return;
                    }
                    map_render = true;
                    var myMap = new ymaps.Map("map", {
                            center: [${filiationData.latitude}, ${filiationData.longitude}],
                            zoom: 16
                        }
                    ),
                    myPlacemark2 = new ymaps.Placemark(
                        [${filiationData.latitude}, ${filiationData.longitude}],
                        {hintContent: ''},
                        {
                            iconLayout: 'default#image',
                            iconImageHref: 'https://dbot.inmonit.com/static/location_point.svg',
                            iconImageSize: [60, 60],
                            iconImageOffset: [-30, -45]
                        }
                    );
                    myMap.geoObjects.add(myPlacemark2)
                    myMap.behaviors.disable('scrollZoom');
                    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
                        myMap.behaviors.disable('drag');
                    }
                }
            </script>
            <div style="height:300px;" id="map"></div>
            <div class="text-address">${filiationData.address}</div>
            <h4 class="variable_title">Контактная информация</h4>
            <div class="sectionTable">
            <div id="number" data-number="${filiationData.phone}">Телефон<span onclick="window.open('tel:${filiationData.phone}', '_blank', 'location=yes,height=570,width=520,scrollbars=yes,status=yes');">${filiationData.phone}</span></div>
            <!--    <div class="hr"></div>-->
            <!--    <div>Телеграм<span onclick="window.open('https://t.me/chatfood', '_blank', 'location=yes,height=570,width=520,scrollbars=yes,status=yes');">@chatfood</span></div>-->
            <!--    <div class="hr"></div>-->


            <!--    <div>Вконтакте<span onclick="window.open('https://vk.com/chatfoodru', '_blank', 'location=yes,height=570,width=520,scrollbars=yes,status=yes');">chatfoodru</span></div>-->
            <!--    <div class="hr"></div>-->
            <!--    <div>Почта<span onclick="window.open('mailto:info@chatfood.ru', '_blank', 'location=yes,height=570,width=520,scrollbars=yes,status=yes');">info@chatfood.ru</span></div>-->
            </div>
            <h4 class="variable_title">Прием заказов осуществляется</h4>
            <div class="sectionTable">
        `;
        Object.keys(filiationData.working_hours).forEach((day_index) => {
            if (!filiationData.working_hours.hasOwnProperty(day_index)) {return}
            let hours = filiationData.working_hours[day_index];
            hours = hours === "Closed" ? "Закрыто" : hours;
            html += `
                <div>${dayI18nMap[day_index]} <span class="text-default">${hours}</span></div>
                <div class="hr"></div>
            `;
        })
        html += `</div>`
        app.html(html);
    },

    getIOrders() {
        //tg.BackButton.show();
        tg.MainButton.hide(function() {});
        //tg.MainButton.text = 'Вызвать такси';
        let dataAjax = {
            'route': 'iCatalog',
        }
        app.attr({
            'class': 'iOrders',
            'data-back': JSON.stringify(dataAjax),
        });
        let data = {
            filiation_id: filiationData.filiation_id,
            page: 1,
        };
        $.ajax({
            url: `${API_HOST}/api/v1/external/order/history`,
            method: 'get',
            dataType: 'json',
            contentType: "application/json",
            headers: headersData,
            data: data,
            beforeSend: function() {
                app.html('<div class="preloader"><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style="margin: auto; background: none; display: block; shape-rendering: auto;" width="200px" height="200px" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid"><path d="M36 50A14 14 0 0 0 64 50A14 15.3 0 0 1 36 50" fill="#e15b64" stroke="none"><animateTransform attributeName="transform" type="rotate" dur="1s" repeatCount="indefinite" keyTimes="0;1" values="0 50 50.65;360 50 50.65"></animateTransform></path></svg></div>');
            },
            success: function(data) {
                let html = '';
                $.each(data.orders, function(i, order_data) {
                    html += `<div class="elem_order">`;
                    html += `
                        <div class="date">${moment(order_data.created_at).format('DD.MM.YYYY HH:mm')}
                            <span class="status">${orderStatus[order_data.order_status]}</span>
                        </div>
                    `;
                    if (order_data.order_type == 'DELIVERY') {
                        html += `<div class="shipping">${order_data.address}</div>`;
                    }
                    html += '<div class="products_order">';
                    $.each(order_data.cart.cart_items, function(i, cart_item) {
                        html +=`
                        <div class="product_elem">
                            ${cart_item.count} x ${cart_item.item_name}
                            <span>${cart_item.full_cost} ${defaultCurrency}</span>
                            ${cart_item.modifier_id != null ? `<div class="property">${cart_item.modifier_name}</div>` : ''}
                        </div>
                        <div class="hr"></div>
                        `;
                    });
                    html += `
                        </div>
<!--                        <div data-ajax='{"route":"iCart","id":${order_data.cart.cart_id}, "action":"repeat"}' class="btn-repeat ajaxLink">Повторить заказ</div>-->
                        </div>
                    `
                });
                app.html(html);
            },
            error: function(data) {}
        });
    },

    getIBooking() {
        tg.BackButton.show();
        tg.MainButton.hide(function() {});
        //tg.MainButton.text = 'Вызвать такси';
        let dataAjax = {
            'route': 'iCatalog',
        }

        app.attr({
            'class': 'iBooking',
            'data-back': JSON.stringify(dataAjax),
        });

        let data = {
            chat_id: chat_id,
        };

        $.ajax({
            url: '/webapp/ajax/booking',
            method: 'post',
            dataType: 'json',
            data: data,
            beforeSend: function() {
                app.html('<div class="preloader"><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style="margin: auto; background: none; display: block; shape-rendering: auto;" width="200px" height="200px" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid"><path d="M36 50A14 14 0 0 0 64 50A14 15.3 0 0 1 36 50" fill="#e15b64" stroke="none"><animateTransform attributeName="transform" type="rotate" dur="1s" repeatCount="indefinite" keyTimes="0;1" values="0 50 50.65;360 50 50.65"></animateTransform></path></svg></div>');
            },
            success: function(data) {
                app.html(data.html);
                getNavICatalog();

            },
            error: function(e) {
                console.log('error add product');
            }
        });

        function getNavICatalog() {
            flkty = new Flickity('.main-gallery',{
                cellAlign: 'center',
                contain: true,
                prevNextButtons: false,
                pageDots: false,
                dragThreshold: 10,
                accessibility: false,
            });

        }

    },

    getITable() {
        tg.BackButton.show();
        tg.MainButton.show(function() {});

        let dataAjax = {
            'route': 'iBooking',
        }

        app.attr({
            'class': 'iTable',
            'data-back': JSON.stringify(dataAjax),
        });

        let data = {
            chat_id: chat_id,
        };

        $.ajax({
            url: '/webapp/ajax/table',
            method: 'post',
            dataType: 'json',
            data: data,
            beforeSend: function() {
                app.html('<div class="preloader"><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style="margin: auto; background: none; display: block; shape-rendering: auto;" width="200px" height="200px" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid"><path d="M36 50A14 14 0 0 0 64 50A14 15.3 0 0 1 36 50" fill="#e15b64" stroke="none"><animateTransform attributeName="transform" type="rotate" dur="1s" repeatCount="indefinite" keyTimes="0;1" values="0 50 50.65;360 50 50.65"></animateTransform></path></svg></div>');
            },
            success: function(data) {
                app.html(data.html);
            },
            error: function(e) {
                console.log('error add product');
            }
        });

        tg.MainButton.text = 'Забронировать';

    },

    getIRating() {
        //tg.BackButton.show();
        tg.MainButton.show(function() {});
        tg.MainButton.text = 'Завершить';
        let dataAjax = {
            'route': 'iCatalog',
        }

        let dataBtn = {
            'route': 'iRatingSend',
        }

        app.attr({
            'class': 'iRating',
            'data-back': JSON.stringify(dataAjax),
            'data-btn': JSON.stringify(dataBtn),
        });

        let data = {
            chat_id: chat_id,
            id: app.attr('data-id'),
        };

        $.ajax({
            url: '/webapp/ajax/rating',
            method: 'post',
            dataType: 'json',
            data: data,
            beforeSend: function() {
                app.html('<div class="preloader"><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" style="margin: auto; background: none; display: block; shape-rendering: auto;" width="200px" height="200px" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid"><path d="M36 50A14 14 0 0 0 64 50A14 15.3 0 0 1 36 50" fill="#e15b64" stroke="none"><animateTransform attributeName="transform" type="rotate" dur="1s" repeatCount="indefinite" keyTimes="0;1" values="0 50 50.65;360 50 50.65"></animateTransform></path></svg></div>');
            },
            success: function(data) {
                if (!data.result) {
                    tg.MainButton.hide(function() {});
                }
                app.html(data.html);

            },
            error: function(e) {
                console.log('error add product');
            }
        });

        $('body').on('click', 'button', function() {
            tg.HapticFeedback.selectionChanged(function() {});

            $(this).parents('.groupBtnBasket').find('button').each(function() {
                $(this).removeClass('active');
            })
            $(this).addClass('active');
        })
    },

    getIRatingSend() {
        let array = [];
        $('.elemList').each(function(i, elem) {
            let rating = $(this).find('.active').attr('data-rating');
            if (rating) {
                array.push({
                    'id': $(this).attr('data-id'),
                    'value': rating,
                })
            }

        });
        console.log(array);
        let data = {
            rating: array,
            chat_id: chat_id,
            review: $('textarea').val(),

        };
        $.ajax({
            url: '/webapp/ajax/set-rating',
            method: 'post',
            dataType: 'json',
            data: data,
            success: function(data) {
                tg.close();
            },
            error: function(e) {
                tg.showAlert('Ошибка');
            }
        });

    },

    createOrder() {
        cartData = get_or_reload_cart(null, true, null, false);

        let discount_sum = 0;
        let order_sum = $('#productPrice').text();
        let delivery_sum = $('#addressPrice').attr('data-price');
        order_sum = order_sum.split(' ');
        let total_price = Number(order_sum[0]) + Number(delivery_sum) - Number(discount_sum);
        let data= {
            payment_method_type: $('#payment input[name="payment"]:checked').val(),
            phone: $('#phone input').val(),
            address: $('#address input').val(),
            comment: $('#comment input').val(),
            amount: cartData.amount || 0,
            final_amount: total_price,
            delivery_time: null,
            order_type: $('#shipping input[name="shipping"]:checked').attr('value'),
            cart_id: cartData.cart_id,
        };
        if (Application.validate(data) && filiationData.stopped == false) {
            $.ajax({
                url: `${API_HOST}/api/v1/external/order`,
                method: 'post',
                dataType: 'json',
                contentType: "application/json",
                headers: headersData,
                data: JSON.stringify(data),
                success: function(data) {
                    if (data) {
                        // window.location.href = "https://yoomoney.ru/checkout/payments/v2/contract?orderId=2da379ce-000f-5000-8000-1102c3fffdad"; // replace with your specific address

                        tg.close();
                    }
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    console.log(errorThrown + " " + textStatus)
                    if (jqXHR.status === 400) {
                        tg.showPopup({message: jqXHR.responseJSON.message});
                    }
                }
            });
        } else {
            tg.HapticFeedback.notificationOccurred('error');
        }
    },

    // createInvoice() {
    //     let data = {
    //         chat_id: chat_id,
    //         payment: $('#payment input[name="payment"]:checked').val(),
    //         shipping: $('#shipping input[name="shipping"]:checked').attr('data-value'),
    //         phone: $('#phone input').val(),
    //         address: $('#address input').val(),
    //         comment: $('#comment input').val(),
    //         coordinates: $('#address').attr('data-coordinate'),
    //         discount: $('#bonus input:checked').val() ? $('#bonus input:checked').val() : 0,
    //         shippingPrice: $('#addressPrice').attr('data-price'),
    //     };
    //     if (Application.validate(data)) {
    //         $.ajax({
    //             url: '/webapp/ajax/create-invoice',
    //             method: 'post',
    //             dataType: 'json',
    //             data: data,
    //             success: function(data) {
    //                 if (data && data.ok) {
    //                     console.log('Ответ оплаты: ');
    //                     console.log(data);
    //                     tg.openInvoice(data.result, function(e) {
    //
    //                         switch (e) {
    //                         case 'paid':
    //                             tg.close();
    //                             break;
    //
    //                         case 'cancelled':
    //                             removeOder();
    //                             break;
    //
    //                         case 'failed':
    //                             alert('Ошибка!');
    //                             removeOder();
    //                             break;
    //
    //                         case 'pending':
    //                             break;
    //                         }
    //                         console.log(e);
    //                     })
    //                 } else {
    //                     console.log(data);
    //                 }
    //             },
    //             error: function(e) {
    //                 console.log('error invoice');
    //             }
    //         });
    //     } else {
    //         tg.HapticFeedback.notificationOccurred('error');
    //     }
    //
    //     function removeOder() {
    //         $.ajax({
    //             url: '/webapp/ajax/remove-order',
    //             method: 'post',
    //             dataType: 'json',
    //             data: data,
    //             success: function(data) {
    //                 console.log(data);
    //             },
    //             error: function(e) {
    //                 console.log('error invoice');
    //             }
    //         });
    //     }
    //
    // },

    validate(data) {
        var validate = true;
        $.each(Application.rules(), function(i, elem) {
            if (elem.required[data.order_type]) {
                if (data[elem.name].length < 1) {
                    validate = false;
                    console.log(elem.name + ' не заполнено!');

                    $('#' + elem.name + ' input').addClass('validateError');
                }
            }
        });

        return validate;
    },

    rules() {
        return [{
            'name': 'phone',
            'required': {
                'DELIVERY': true,
                'TAKE_AWAY': true,
                'INSIDE': true,
            }
        }, {
            'name': 'address',
            'required': {
                'DELIVERY': true,
                'TAKE_AWAY': false,
                'INSIDE': false,
            }
        }, {
            'name': 'comment',
            'required': {
                'DELIVERY': false,
                'TAKE_AWAY': false,
                'INSIDE': false,
            }
        }]
    },

    route(data) {
        tg.MainButton.enable();
        tg.MainButton.show();

        switch (data.route) {

        case 'iCatalog':
            app.html('');
            Application.getICatalog();
            break;

        case 'iStory':
            app.html('');
            Application.getIStory(data.id);
            break;

        case 'iProduct':
            app.html('');
            Application.getIProduct(data.id);
            break;

        case 'iCart':
            app.html('');
            console.log(data);
            try {
                if (data.action === 'repeat') {
                    Application.repeatOrder(data.id);
                }
            } catch (e) {}

            Application.getICart();
            break;

        case 'iRepeat':
            app.html('');
            Application.getICart();
            break;

        case 'iOrder':
            app.html('');
            Application.getIOrder();
            break;

        // case 'iPolicy':
        //     app.html('');
        //     Application.getIPolicy();
        //     break;

        case 'iCreate':
            Application.createOrder();
            break;

        // case 'iPay':
        //     Application.createInvoice();
        //     break;

        case 'iProfile':
            app.html('');
            Application.getIProfile();
            break;

        case 'iContact':
            app.html('');
            Application.getIContact();
            break;

        case 'iRating':
            app.html('');
            Application.getIRating();
            break;

        case 'iRatingSend':
            Application.getIRatingSend();
            break;

        case 'iOrders':
            app.html('');
            Application.getIOrders();
            break;

        case 'iBooking':
            app.html('');
            Application.getIBooking();
            break;

        case 'iTable':
            app.html('');
            Application.getITable();
            break;
        }
    }

};

function init() {
    moment.locale('ru');
    moment().format('DD.MM.YYYY HH:mm');
    var route = app.attr('data-route');

    switch (route) {
    case 'iCatalog':
        app.html('');
        Application.getICatalog();
        break;
    case 'iProfile':
        app.html('');
        Application.getIProfile();
        break;
    case 'iContact':
        app.html('');
        Application.getIContact();
        break;
    case 'iOrders':
        app.html('');
        Application.getIOrders();
        break;
    case 'iBooking':
        app.html('');
        Application.getIBooking();
        break;
    case 'iRating':
        app.html('');
        Application.getIRating();
        break;
    default:
        app.html('');
        Application.getICatalog();
        break;
    }

    console.log(route);

}

$(window).on('load', function() {
    get_filiation_info()
});

$('body').on('click', '.ajaxLink', function() {
    let data = JSON.parse($(this).attr('data-ajax'));
    let parent = $(this).parents('.cardProduct');
    let _scroll = $(window).scrollTop();
    app.attr('data-scroll', _scroll);
    tg.HapticFeedback.impactOccurred('soft');
    console.log(data);
    Application.route(data);
});

tg.BackButton.onClick(function() {
    let data = JSON.parse(app.attr('data-back'));
    tg.HapticFeedback.impactOccurred('soft');
    Application.route(data);
});

tg.MainButton.onClick(function() {
    tg.MainButton.disable();

    //e.stopImmediatePropagation();
    let data = JSON.parse(app.attr('data-btn'));
    tg.HapticFeedback.impactOccurred('soft');

    if (data.route === 'call') {
        let number = $('#number').attr('data-number');
        window.open('tel:' + number, '_blank', 'location=yes,height=570,width=520,scrollbars=yes,status=yes')
    }

    Application.route(data);
})
