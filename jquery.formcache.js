(function ($) {

    //###############################################################################

    /*  
    *   jQuery formCache plugin
    *   Original author: @pedromontoya
    *   Description:
    *   This plugin is to cache form values on the client browser using the 
    *   window.localStorage object. It also offers optional notification support to inform the user
    *   that values have been restored from the cache. Giving them the option of clearing the cache and resetting the form.
    *
    *   INSTRUCTIONS:
    *
    *    Designating a form for caching:
    *        1) Add the 'data-formcache="true"' attribute
    *        2) Add the 'data-formcache-key="someKey"' attribute
    *            - This key should be unique. If viewing a form for a specific record for example, 
    *              the key should probably include that records ID.
    *        3) Initialize form caching with jQuery selector $('some-form-selection').formCache()
    *
    *    Using the Notification Section(optional):
    *       1) Add CSS class for the notification section(optional):
    *            .formcache-notification{
    *               //Style notification section
    *            }
    *       2) Add notification div within the form being cached:
    *            <div class="formcache-notification" style="display: none;">
    *                <p>Your form data has been successfully restored.
    *                   <button type="button" data-formcache-clear="true">Reset form</button>
    *                </p>
    *            </div>
    */

    //###############################################################################

    var keyPrefix = "FORM_CACHE_",
        cachedKeysObjectKey = "FORM_CACHE_KEY_OBJECT";

    //Local storage helper methods.
    $.formCache = {
        GetKeysObject: function () {
            if (window.localStorage) {
                var cachedKeyObjectString = window.localStorage[cachedKeysObjectKey];

                //Proceed if a JSON key object string was found
                if (cachedKeyObjectString) {
                    var cachedKeyObject = JSON.parse(cachedKeyObjectString);
                    if (cachedKeyObject) {
                        return cachedKeyObject;
                    }
                }
            }
            return {};
        },
        RemoveItem: function (key) {
            if (window.localStorage && key) {
                //Assemble key
                var cacheKey = keyPrefix + key;

                //Remove item
                window.localStorage.removeItem(cacheKey);

                //Delete key
                var cachedKeys = this.GetKeysObject();
                delete cachedKeys[cacheKey];
                window.localStorage[cachedKeysObjectKey] = JSON.stringify(cachedKeys);
            }
        },
        AddItem: function (key, data) {
            if (window.localStorage && key && data) {
                //Assemble key
                var cacheKey = keyPrefix + key;

                //Cache item
                window.localStorage[cacheKey] = data;

                //Store key
                var cachedKeys = this.GetKeysObject();
                cachedKeys[cacheKey] = cacheKey;
                window.localStorage[cachedKeysObjectKey] = JSON.stringify(cachedKeys);
            }
        },
        GetItem: function (key) {
            if (window.localStorage && key) {
                //Assemble key
                var cacheKey = keyPrefix + key;

                //Get item
                return window.localStorage.getItem(cacheKey);
            }
        },
        ClearAllCachedFormData: function () {
            if (window.localStorage) {
                var cachedKeys = this.GetKeysObject();

                var item;
                for (item in cachedKeys) {
                    if (cachedKeys.hasOwnProperty(item)) {
                        //Remove item
                        window.localStorage.removeItem(item);

                        //Delete key
                        delete cachedKeys[item];
                        window.localStorage[cachedKeysObjectKey] = JSON.stringify(cachedKeys);
                    }
                }
            }
        }
    };

    //###############################################################################

    //Helper function to convert form values into a JSON string.
    $.formCache.FormToJsonString = function ($formElement) {
        var jsonResultObject = {},
            jsonReslutString = "",
            formValueArray = $formElement.serializeArray();

        if (formValueArray && formValueArray.length > 0) {
            //Iterate over each object in the form value array
            $.each(formValueArray, function () {
                //Only process objects with a value
                if (this.value) {
                    //Only add value/property to JSON object if it has not already been added.
                    if (jsonResultObject[this.name] === undefined) {
                        jsonResultObject[this.name] = this.value;
                    }
                }
            });

            //Turn generated JSON object into a string.
            if (JSON && JSON.stringify) {
                var tmpJsonResultString = JSON.stringify(jsonResultObject);

                //Only return a result if a non-empty JSON string was generated.
                if (tmpJsonResultString && tmpJsonResultString !== "{}") {
                    jsonReslutString = tmpJsonResultString;
                }
            }
        }
        return jsonReslutString;
    };

    //###############################################################################

    $.fn.formCache = function () {
        //Do not proceed if local storage is not supported.
        if (!window.localStorage) {
            return this;
        };

        //Iterate over each form in the selected element collection.
        return this.each(function () {
            var $formElement = $(this),                         //Wrap form element with jQuery Object.
                isSubmitting = false;                           //Used by unload event to determine if form should be cached.
            cacheKey = $formElement.data("formcache-key"),  //Grab cache key from form data- attribute.
            $notificationSection = $formElement.find(".formcache-notification"); //Grab notification section, if defined.

            //Do not proceed if a formcache-key data attribute was not specified.
            if (cacheKey) {
                //Register event handler to restore cached form values.
                $(document).ready(function () {
                    var showSuccessNotification = false;

                    try {
                        var jsonDataString = $.formCache.GetItem(cacheKey), //Get cached form JSON string.
                            jsonDataObject = $.parseJSON(jsonDataString);   //Convert cached JSON string to an Object.

                        //Proceed if a JSON object was correctly parsed.
                        if (jsonDataObject) {
                            var property;

                            //Iterate over object properties.
                            for (property in jsonDataObject) {
                                //Check that the property belong to the Object, not to its Prototype.
                                if (jsonDataObject.hasOwnProperty(property)) {
                                    //Check if the Object property has a value.
                                    if (jsonDataObject[property]) {
                                        //Get handle on element with name matching that of the Object property.
                                        var $element = $("[name='" + property + "']").first();

                                        //If a DOM element was found, attempt to set it's value to that of the
                                        //JSON property.
                                        if ($element && $element.length > 0) {
                                            if ($element[0].type.toUpperCase() == "CHECKBOX") {     //Handle restoring value for checkbox elements
                                                if (jsonDataObject[property] === "true") {
                                                    //Set value if it is not already checked
                                                    if (!$element[0].checked) {
                                                        $element[0].checked = true;
                                                        showSuccessNotification = true;

                                                        //Trigger change event
                                                        $element.change();
                                                    }
                                                }
                                            } else if ($element[0].type.toUpperCase() == "RADIO") {     //Handle restoring value for radio elements
                                                if (jsonDataObject[property]) {
                                                    //Get the radio element associated with the stored value.
                                                    var $radioElement = $("[name='" + property + "']").filter(function () {
                                                        return $(this).val() === jsonDataObject[property];
                                                    }).first();

                                                    if ($radioElement && $radioElement.length > 0) {
                                                        //Set value if it is not already checked
                                                        if (!$radioElement[0].checked) {
                                                            $radioElement[0].checked = true;
                                                            showSuccessNotification = true;

                                                            //Trigger change event
                                                            $radioElement.change();
                                                        }
                                                    }
                                                }
                                            } else {                                                    //Handle restoring the value for all other input elements. 
                                                $element.val(jsonDataObject[property]);
                                                showSuccessNotification = true;

                                                //Trigger change event
                                                $element.change();
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    } catch (exception) {
                        showSuccessNotification = false;
                        //Eat exception, yum.
                    }

                    //Update optional notification section
                    if ($notificationSection && $notificationSection.length > 0) {
                        if (showSuccessNotification) {
                            $notificationSection.show();
                        } else {
                            $notificationSection.hide();
                        }
                    }
                });

                //Register event handler to cache form values.
                $(window).unload(function () {
                    try {
                        if (!isSubmitting) {
                            //Get form data
                            var jsonDataString = $.formCache.FormToJsonString($formElement);

                            //Store form data in browsers local storage
                            $.formCache.AddItem(cacheKey, jsonDataString);
                        }
                    } catch (exception) {
                        //Eat exception, yum.
                    }
                });

                //Register submit handler on form, clearing cached values on submit
                $formElement.submit(function (e) {
                    //Clear cached values
                    $.formCache.RemoveItem(cacheKey);

                    //Set submit flag to true. This will prevent values from being cached on page unload.
                    isSubmitting = true;

                    return true;
                });

                //Proceed if a notification section is defined for this form.
                if ($notificationSection && $notificationSection.length > 0) {
                    //Register event handler to notify a user when values are restored.
                    $(document).ready(function () {
                        var $resetElement = $notificationSection.first().find("[data-formcache-clear]");

                        //Proceed if a reset element is defined for this form.
                        if ($resetElement && $resetElement.length > 0) {
                            $resetElement.first().click(function () {
                                //Clear cached values
                                $.formCache.RemoveItem(cacheKey);

                                //Reset the form
                                $formElement[0].reset();

                                //Trigger change events on all input/select/textarea elements within the form.
                                $("input, select, textarea", $formElement).change();

                                //Hide notification
                                $notificationSection.hide();
                            });
                        }
                    })
                };
            }
        });
    };

    //###############################################################################

    //Initialize forms flagged for caching.
    $(function () {
        $("[data-formcache]").formCache();
    });

    //###############################################################################

})(jQuery)