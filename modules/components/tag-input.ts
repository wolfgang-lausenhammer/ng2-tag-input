import {
    Component,
    forwardRef,
    Input,
    Output,
    EventEmitter,
    Renderer,
    ViewChild,
    ViewChildren,
    ContentChildren,
    ContentChild,
    OnInit,
    TemplateRef,
    QueryList,
    animate,
    trigger,
    style,
    transition,
    keyframes,
    state
} from '@angular/core';

import { FormControl, NG_VALUE_ACCESSOR } from '@angular/forms';
import * as constants from './helpers/constants';
import listen from './helpers/listen';

import { TagInputAccessor, TagModel } from './helpers/accessor';
import { TagInputForm } from './tag-input-form/tag-input-form.component';
import { TagInputDropdown } from './dropdown/tag-input-dropdown.component';
import { TagComponent } from './tag/tag.component';

import 'rxjs/add/operator/debounceTime';

/**
 * A component for entering a list of terms to be used with ngModel.
 */
@Component({
    selector: 'tag-input',
    providers: [ {
        provide: NG_VALUE_ACCESSOR,
        useExisting: forwardRef(() => TagInputComponent),
        multi: true
    } ],
    styleUrls: [ './tag-input.style.scss' ],
    templateUrl: './tag-input.template.html',
    animations: [
        trigger('flyInOut', [
            state('in', style({transform: 'translateX(0)'})),
            transition(':enter', [
                animate(250, keyframes([
                    style({opacity: 0, offset: 0, transform: 'translate(0px, 20px)'}),
                    style({opacity: 0.3, offset: 0.3, transform: 'translate(0px, -10px)'}),
                    style({opacity: 0.5, offset: 0.5, transform: 'translate(0px, 0px)'}),
                    style({opacity: 0.75, offset: 0.75, transform: 'translate(0px, 5px)'}),
                    style({opacity: 1, offset: 1, transform: 'translate(0px, 0px)'})
                ]))
            ]),
            transition(':leave', [
                animate(150, keyframes([
                    style({opacity: 1, transform: 'translateX(0)', offset: 0}),
                    style({opacity: 1, transform: 'translateX(-15px)', offset: 0.7}),
                    style({opacity: 0, transform: 'translateX(100%)', offset: 1.0})
                ]))
            ])
        ])
    ]
})
export class TagInputComponent extends TagInputAccessor implements OnInit {
    /**
     * @name separatorKeys
     * @desc keyboard keys with which a user can separate items
     * @type {Array}
     */
    @Input() public separatorKeys: string[] = [];

    /**
     * @name separatorKeyCodes
     * @desc keyboard key codes with which a user can separate items
     * @type {Array}
     */
    @Input() public separatorKeyCodes: number[] = [];

    /**
     * @name placeholder
     * @desc the placeholder of the input text
     * @type {string}
     */
    @Input() public placeholder: string = constants.PLACEHOLDER;

    /**
     * @name secondaryPlaceholder
     * @desc placeholder to appear when the input is empty
     * @type {string}
     */
    @Input() public secondaryPlaceholder: string = constants.SECONDARY_PLACEHOLDER;

    /**
     * @name maxItems
     * @desc maximum number of items that can be added
     * @type {number}
     */
    @Input() public maxItems: number;

    /**
     * @name readonly
     * @desc if set to true, the user cannot remove/addItem new items
     * @type {boolean}
     */
    @Input() public readonly: boolean;

    /**
     * @name animationDisabled
     * @desc if set to true, the flyInOut animation is disabled
     * @type {boolean}
     */
    @Input() public animationDisabled = false;

    /**
     * @name transform
     * @desc function passed to the component to transform the value of the items, or reject them instead
     */
    @Input() public transform: (item: string) => string = (item) => item;

    /**
     * @name validators
     * @desc array of Validators that are used to validate the tag before it gets appended to the list
     * @type {Validators[]}
     */
    @Input() public validators = [];

    /**
    * - if set to true, it will only possible to add items from the autocomplete
    * @name onlyFromAutocomplete
    * @type {Boolean}
    */
    @Input() public onlyFromAutocomplete = false;

	/**
     * @name errorMessages
     * @type {Map<string, string>}
     */
    @Input() public errorMessages: {[key: string]: string} = {};

    /**
     * @name theme
     * @type {string}
     */
    @Input() public theme = 'default';

    /**
     * @name onTextChangeDebounce
     * @type {number}
     */
    @Input() public onTextChangeDebounce = 250;

    /**
     * - custom id assigned to the input
     * @name id
     */
    @Input() public inputId: string;

    /**
     * - custom class assigned to the input
     */
    @Input() public inputClass: string;

    /**
     * - option to clear text input when the form is blurred
     * @name clearOnBlur
     */
    @Input() public clearOnBlur: string;

    /**
     * - hideForm
     * @name clearOnBlur
     */
    @Input() public hideForm: string;

    /**
     * @name addOnBlur
     */
    @Input() public addOnBlur: boolean;

    /**
     * @name addOnPaste
     */
    @Input() public addOnPaste: boolean;

    /**
     * - pattern used with the native method split() to separate patterns in the string pasted
     * @name pasteSplitPattern
     */
    @Input() public pasteSplitPattern = ',';

    /**
     * @name blinkIfDupe
     * @type {boolean}
     */
    @Input() public blinkIfDupe = true;

    /**
     * @name removable
     * @type {boolean}
     */
    @Input() public removable = true;

    /**
     * @name editable
     * @type {boolean}
     */
    @Input() public editable = false;

    /**
     * @name allowDupes
     * @type {boolean}
     */
    @Input() public allowDupes = false;

    /**
     * @description if set to true, the newly added tags will be added as strings, and not objects
     * @name modelAsStrings
     * @type {boolean}
     */
    @Input() public modelAsStrings = false;

    /**
     * @name trimTags
     * @type {boolean}
     */
    @Input() public trimTags = true;

    /**
     * @name inputText
     */
    @Input() public get inputText(): string {
        return this.inputTextValue;
    }

    /**
     * @name onAdd
     * @desc event emitted when adding a new item
     * @type {EventEmitter<string>}
     */
    @Output() public onAdd = new EventEmitter<TagModel>();

    /**
     * @name onRemove
     * @desc event emitted when removing an existing item
     * @type {EventEmitter<string>}
     */
    @Output() public onRemove = new EventEmitter<TagModel>();

    /**
     * @name onSelect
     * @desc event emitted when selecting an item
     * @type {EventEmitter<string>}
     */
    @Output() public onSelect = new EventEmitter<TagModel>();

    /**
     * @name onFocus
     * @desc event emitted when the input is focused
     * @type {EventEmitter<string>}
     */
    @Output() public onFocus = new EventEmitter<string>();

    /**
     * @name onFocus
     * @desc event emitted when the input is blurred
     * @type {EventEmitter<string>}
     */
    @Output() public onBlur = new EventEmitter<string>();

    /**
     * @name onTextChange
     * @desc event emitted when the input value changes
     * @type {EventEmitter<string>}
     */
    @Output() public onTextChange = new EventEmitter<TagModel>();

    /**
     * - output triggered when text is pasted in the form
     * @name onPaste
     * @type {EventEmitter<TagModel>}
     */
    @Output() public onPaste = new EventEmitter<string>();

    /**
     * - output triggered when tag entered is not valid
     * @name onValidationError
     * @type {EventEmitter<string>}
     */
    @Output() public onValidationError = new EventEmitter<TagModel>();

    /**
     * - output triggered when tag is edited
     * @name onTagEdited
     * @type {EventEmitter<TagModel>}
     */
    @Output() public onTagEdited = new EventEmitter<TagModel>();

    /**
     * @name dropdown
     */
    @ContentChild(TagInputDropdown) public dropdown: TagInputDropdown;

    /**
     * @name template
     * @desc reference to the template if provided by the user
     * @type {TemplateRef}
     */
    @ContentChildren(TemplateRef, {descendants: false}) public templates: QueryList<TemplateRef<any>>;

	/**
     * @name inputForm
     * @type {TagInputForm}
     */
    @ViewChild(TagInputForm) public inputForm: TagInputForm;

    /**
     * @name selectedTag
     * @desc reference to the current selected tag
     * @type {String}
     */
    public selectedTag: TagModel;

    /**
     * @name isLoading
     * @type {boolean}
     */
    public isLoading = false;

    /**
     * @name inputText
     * @param text
     */
    public set inputText(text: string) {
        this.inputTextValue = text;
        this.inputTextChange.emit(text);
    }

    /**
     * @name tags
     * @desc list of Element items
     */
    @ViewChildren(TagComponent) public tags: QueryList<TagComponent>;

    /**
     * @name listeners
     * @desc array of events that get fired using @fireEvents
     * @type []
     */
    private listeners = {
        [constants.KEYDOWN]: <{(fun): any}[]>[],
        [constants.KEYUP]: <{(fun): any}[]>[],
        change: <{(fun): any}[]>[]
    };

    /**
     * @description emitter for the 2-way data binding inputText value
     * @name inputTextChange
     * @type {EventEmitter}
     */
    @Output() private inputTextChange: EventEmitter<string> = new EventEmitter();

    /**
     * @description private variable to bind get/set
     * @name inputTextValue
     * @type {string}
     */
    private inputTextValue = '';

    constructor(private renderer: Renderer) {
        super();
    }

    /**
     * @name removeItem
     * @desc removes an item from the array of the model
     * @param tag {TagModel}
     * @param index {number}
     */
    public removeItem(tag: TagModel, index: number): void {
        this.items = this.getItemsWithout(index);

        // if the removed tag was selected, set it as undefined
        if (this.selectedTag === tag) {
            this.selectedTag = undefined;
        }

        // focus input
        this.focus(true, false);

        // emit remove event
        this.onRemove.emit(tag);
    }

    /**
     * @name addItem
     * @desc adds the current text model to the items array
     */
    public addItem(isFromAutocomplete = false, item: TagModel = this.inputForm.value.value): void {
        const display = typeof item === 'string' ? item : item[this.displayBy];
        const value = typeof item === 'string' ? item : item[this.identifyBy];

        const inputValue = this.setInputValue(display);

        if (!this.inputForm.form.valid || !inputValue) {
            return;
        }

        const tag = this.createTag(inputValue, isFromAutocomplete ? value : inputValue);
        const isValid = this.isTagValid(tag, isFromAutocomplete);

        if (isValid) {
            this.appendNewTag(tag);
        } else {
            this.onValidationError.emit(tag);
        }

        // reset control and focus input
        this.setInputValue('');

        // focus input
        this.focus(true, false);
    }

    /**
     *
     * @param tag
     * @param isFromAutocomplete
     */
    public isTagValid(tag: TagModel, isFromAutocomplete = false): boolean {
        const selectedItem = this.dropdown ? this.dropdown.selectedItem : undefined;

        if (selectedItem && !isFromAutocomplete) {
            return;
        }

        // check if the transformed item is already existing in the list
        const dupe = this.items.find((item: TagModel) => {
            const identifyBy = isFromAutocomplete ? this.dropdown.identifyBy : this.identifyBy;
            const displayBy = isFromAutocomplete ? this.dropdown.displayBy : this.displayBy;

            return this.getItemValue(item) === tag[identifyBy] ||
                this.getItemValue(item) === tag[displayBy];
        });

        const hasDupe = !!dupe && dupe !== undefined;

        // if so, give a visual cue and return false
        if (!this.allowDupes && hasDupe && this.blinkIfDupe) {
            const item = this.tags.find(_tag => {
                return this.getItemValue(_tag.model) === this.getItemValue(dupe);
            });

            if (item) {
                item.blink();
            }
        }

        const fromAutocomplete = isFromAutocomplete && this.onlyFromAutocomplete;
        const assertions = [
            // 1. there must be no dupe OR dupes are allowed
            !hasDupe || this.allowDupes === true,

            // 2. check max items has not been reached
            this.maxItemsReached === false,

            // 3. check item comes from autocomplete or onlyFromAutocomplete is false
            ((fromAutocomplete) || this.onlyFromAutocomplete === false)
        ];

        return assertions.filter(item => item).length === assertions.length;
    }

    /**
     * @name appendNewTag
     * @param tag
     */
    public appendNewTag(tag: TagModel): void {
        const newTag = this.modelAsStrings ? tag[this.identifyBy] : tag;

        // push item to array of items
        this.items = [...this.items, newTag];

        // emit event
        this.onAdd.emit(tag);
    }

    /**
     * @name createTag
     * @param display
     * @param value
     * @returns {{}}
     */
    public createTag(display: string, value: any): TagModel {
        const trim = (val: TagModel): TagModel => typeof val === 'string' ? val.trim() : val;

        return {
            [this.displayBy]: this.trimTags ? trim(display) : display,
            [this.identifyBy]: this.trimTags ? trim(value) : value
        };
    }

    /**
     * @name selectItem
     * @desc selects item passed as parameter as the selected tag
     * @param item
     */
    public selectItem(item: TagModel): void {
        if (this.readonly || !item) {
            return;
        }

        this.selectedTag = item;

        // emit event
        this.onSelect.emit(item);
    }

    /**
     * @name fireEvents
     * @desc goes through the list of the events for a given eventName, and fires each of them
     * @param eventName
     * @param $event
     */
    public fireEvents(eventName: string, $event?): void {
        this.listeners[eventName].forEach(listener => listener.call(this, $event));
    }

    /**
     * @name handleKeydown
     * @desc handles action when the user hits a keyboard key
     * @param data
     */
    public handleKeydown(data: any): void {
        const event = data.event;
        const key = event.keyCode || event.which;

        switch (constants.KEY_PRESS_ACTIONS[key]) {
            case constants.ACTIONS_KEYS.DELETE:
                if (this.selectedTag && this.removable) {
                    this.removeItem(this.selectedTag, this.items.indexOf(this.selectedTag));
                }
                break;
            case constants.ACTIONS_KEYS.SWITCH_PREV:
                this.switchPrev(data.model);
                break;
            case constants.ACTIONS_KEYS.SWITCH_NEXT:
                this.switchNext(data.model);
                break;
            case constants.ACTIONS_KEYS.TAB:
                this.switchNext(data.model);
                break;
            default:
                return;
        }

        // prevent default behaviour
        event.preventDefault();
    }

    /**
     * @name seyInputValue
     * @param value
     * @returns {string}
     */
    public setInputValue(value: string): string {
        const item = value ? this.transform(value) : '';
        const control = this.getControl();

        // update form value with the transformed item
        control.setValue(item);

        return item;
    }

    /**
     * @name getControl
     * @returns {FormControl}
     */
    private getControl(): FormControl {
        return <FormControl>this.inputForm.value;
    }

	/**
     * @name focus
     * @param applyFocus
     * @param displayAutocomplete
     */
    public focus(applyFocus = false, displayAutocomplete = false): void {
        if (this.readonly) {
            return;
        }

        const value = this.inputForm.value.value;
        this.selectedTag = undefined;

        if (applyFocus) {
            this.inputForm.focus();
            this.onFocus.emit(value);
        }

        if (displayAutocomplete && this.dropdown) {
            this.dropdown.show();
        }
    }

	/**
     * @name blur
     */
    public blur(): void {
        this.onBlur.emit(this.inputForm.value.value);
    }

    /**
     * @name hasErrors
     * @returns {boolean}
     */
    public hasErrors(): boolean {
        return this.inputForm && this.inputForm.hasErrors();
    }

    /**
     * @name isInputFocused
     * @returns {boolean}
     */
    public isInputFocused(): boolean {
        return this.inputForm && this.inputForm.isInputFocused();
    }

    /**
     * - this is the one way I found to tell if the template has been passed and it is not
     * the template for the menu item
     * @name hasCustomTemplate
     */
    public hasCustomTemplate(): boolean {
        const template = this.templates ? this.templates.first : undefined;
        const menuTemplate = this.dropdown && this.dropdown.templates ? this.dropdown.templates.first : undefined;
        return template && template !== menuTemplate;
    }

    /**
     * @name switchNext
     * @param item { TagModel }
     */
    public switchNext(item: TagModel): void {
        if (this.tags.last.model === item) {
            this.focus(true);
            return;
        }

        const tags = this.tags.toArray();
        const tagIndex = tags.findIndex(tag => tag.model === item);
        const tag = tags[tagIndex + 1];

        tag.select.call(tag);
    }

    /**
     * @name switchPrev
     * @param item { TagModel }
     */
    public switchPrev(item: TagModel): void {
        if (this.tags.first.model !== item) {
            const tags = this.tags.toArray();
            const tagIndex = tags.findIndex(tag => tag.model === item);
            const tag = tags[tagIndex - 1];

            tag.select.call(tag);
        }
    }

	/**
     * @name maxItemsReached
     * @returns {boolean}
     */
    public get maxItemsReached(): boolean {
        return this.maxItems !== undefined && this.items.length >= this.maxItems;
    }

    /**
     * @name trackBy
     * @param item
     * @returns {string}
     */
    private trackBy(item: TagModel): string {
        return item[this.identifyBy];
    }

    /**
     * @name onPasteCallback
     * @param data
     */
    private onPasteCallback(data: ClipboardEvent) {
        const text = data.clipboardData.getData('text/plain');

        text.split(this.pasteSplitPattern)
            .map(item => this.createTag(item, item))
            .forEach(item => {
                const display = this.transform(item[this.displayBy]);
                const tag = this.createTag(display, display);

                if (this.isTagValid(tag)) {
                    this.appendNewTag(tag);
                }
            });

        this.onPaste.emit(text);

        setTimeout(() => this.setInputValue(''), 0);
    }

    /**
     * @name ngOnInit
     */
    public ngOnInit() {
        // setting up the keypress listeners
        listen.call(this, constants.KEYDOWN, ($event) => {
            const itemsLength = this.items.length;
            const inputValue = this.inputForm.value.value;
            const isCorrectKey = $event.keyCode === 37 || $event.keyCode === 8;

            if (isCorrectKey &&
                !inputValue &&
                itemsLength) {
                    this.tags.last.select.call(this.tags.last);
            }
        });

        const useSeparatorKeys = this.separatorKeyCodes.length > 0 || this.separatorKeys.length > 0;

        listen.call(this, constants.KEYDOWN, ($event) => {
            const hasKeyCode = this.separatorKeyCodes.indexOf($event.keyCode) >= 0;
            const hasKey = this.separatorKeys.indexOf($event.key) >= 0;

            if (hasKeyCode || hasKey) {
                $event.preventDefault();
                this.addItem();
            }

        }, useSeparatorKeys);

        // if the number of items specified in the model is > of the value of maxItems
        // degrade gracefully and let the max number of items to be the number of items in the model
        // though, warn the user.
        const maxItemsReached = this.maxItems !== undefined && this.items && this.items.length > this.maxItems;

        if (maxItemsReached) {
            this.maxItems = this.items.length;
            console.warn(constants.MAX_ITEMS_WARNING);
        }
    }

    /**
     * @name ngAfterViewInit
     */
    public ngAfterViewInit() {
        this.inputForm.onKeydown.subscribe(event => {
            this.fireEvents('keydown', event);

            if (event.key === 'Backspace' && this.inputForm.value.value === '') {
                event.preventDefault();
            }
        });

        if (this.onTextChange.observers.length) {
            this.inputForm.form.valueChanges
                .debounceTime(this.onTextChangeDebounce)
                .subscribe(() => {
                    const value = this.inputForm.value.value;
                    this.onTextChange.emit(value);
                });
        }

        // if clear on blur is set to true, subscribe to the event and clear the text's form
        if (this.clearOnBlur || this.addOnBlur) {
            this.inputForm
                .onBlur
                .filter(() => {
                    return this.dropdown ? this.dropdown.isVisible === false : true;
                })
                .subscribe(() => {
                    if (this.addOnBlur) {
                        this.addItem();
                    }

                    this.setInputValue('');
                });
        }

        // if addOnPaste is set to true, register the handler and add items
        if (this.addOnPaste) {
            const input = this.inputForm.input.nativeElement;

            // attach listener to input
            this.renderer.listen(input, 'paste', this.onPasteCallback.bind(this));
        }

        // if hideForm is set to true, remove the input
        if (this.hideForm) {
            this.inputForm.destroy();
        }
    }
}
