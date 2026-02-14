let eventBus = new Vue()

// Универсальный компонент столбца
Vue.component('kanban-column', {
    template: `
    <div class="col" :style="columnStyle">
        <h2>{{ columnTitle }}</h2>
        <div 
            class="cards" 
            v-for="(card, index) in cards" 
            :key="index"
            :style="{ 'background-color': columnColor }"
        >
            <!-- Кнопки удаления и редактирования для столбцов 1, 2 и 3 -->
            <template v-if="columnIndex < 3">
                <a @click="deleteCard(card)">Удалить</a>
                <a @click="card.editB = true">Редактировать</a>
            </template>
            
            <p class="card-title">{{ card.title }}</p>
            <ul>
                <li class="tasks">Описание: {{ card.description }}</li>
                <li class="tasks">Дата создания: {{ card.date }}</li>
                <li class="tasks">Дедлайн: {{ card.deadline }}</li>
                
                <li class="tasks" v-if="card.reason != null && columnIndex !== 0">
                    Причина перевода: {{ card.reason }}
                </li>
                
                <li class="tasks" v-if="card.edit != null">
                    Последнее изменение: {{ card.edit }}
                </li>
                
                <li class="tasks" v-if="card.editB">
                    <form @submit.prevent="updateTask(card)">
                        <p>Новый заголовок: 
                            <input type="text" v-model="card.title" maxlength="30" placeholder="Заголовок">
                        </p>
                        <p>Новое описание: 
                            <textarea v-model="card.description" cols="20" rows="5"></textarea>
                        </p>
                        <p><input type="submit" value="Редактировать"></p>
                    </form>
                </li>
                
                <li class="tasks" v-if="card.transfer && columnIndex === 2">
                    <form @submit.prevent="transferToCol2(card)">
                        <p>Причина перевода: 
                            <input type="text" v-model="card.reason">
                        </p>
                        <p><input type="submit" value="ОК"></p>
                    </form>
                </li>
                
                <!-- Статус выполнения для последнего столбца -->
                <li class="tasks" v-if="columnIndex === 3 && card.current">
                    ✅ Выполнено в срок
                </li>
                <li class="tasks" v-if="columnIndex === 3 && !card.current">
                    ⚠️ Не выполнено в срок
                </li>
            </ul>
            
            <template v-if="columnIndex < 2">
                <a @click="moveToNextColumn(card)">Следующий столбец</a>
            </template>
            
            <template v-if="columnIndex === 2">
                <a @click="card.transfer = true">Последний столбец</a> | 
                <a @click="moveToNextColumn(card)">Следующий столбец</a>
            </template>
        </div>
    </div>
    `,
    props: {
        cards: {
            type: Array,
            required: true
        },
        columnIndex: {
            type: Number,
            required: true
        }
    },
    computed: {
        columnTitle() {
            const titles = [
                'Запланированные задачи',
                'Задачи в работе',
                'Тестирование',
                'Завершенные задачи'
            ]
            return titles[this.columnIndex] || ''
        },
        columnColor() {
            const colors = [
                '#e79ba2',
                'lightblue',
                '#f5f287',
                'lightgreen'
            ]
            return colors[this.columnIndex] || '#f9f9f9'
        },
        columnStyle() {
            return {}
        }
    },
    methods: {
        moveToNextColumn(card) {
            const currentIndex = this.cards.indexOf(card)
            if (currentIndex !== -1) {
                this.cards.splice(currentIndex, 1)
                
                // Определяем событие для следующего столбца
                const events = ['addColumn2', 'addColumn3', 'addColumn4']
                const nextEvent = events[this.columnIndex]
                
                if (nextEvent) {
                    eventBus.$emit(nextEvent, card)
                }
            }
        },
        deleteCard(card) {
            const index = this.cards.indexOf(card)
            if (index !== -1) {
                this.cards.splice(index, 1)
                console.log('Карточка удалена из массива')  
                eventBus.$emit('cardDeleted') 
            }
        },
        updateTask(card) {
            card.editB = false
            card.edit = new Date().toLocaleString()
            
            
            // Перемещаем карточку в конец массива для обновления порядка
            const index = this.cards.indexOf(card)
            if (index !== -1) {
                this.cards.splice(index, 1)
                this.cards.push(card)
                console.log('Карточка изменена')  
                eventBus.$emit('cardUpdated')
            }
        },
        transferToCol2(card) {
            card.transfer = false
            const index = this.cards.indexOf(card)
            if (index !== -1) {
                this.cards.splice(index, 1)
                eventBus.$emit('addColumn2', card)
            }
        }
    }
})

Vue.component('cols', {
    template: `
    <div id="cols">
        <newcard></newcard>
        <div class="cols__content">
            <kanban-column 
                v-for="(column, index) in columns" 
                :key="index"
                :cards="column.cards"
                :column-index="index"
            ></kanban-column>
        </div>
    </div>
    `,
    data() {
        return {
            columns: [
                { cards: [] }, // column1
                { cards: [] }, // column2
                { cards: [] }, // column3
                { cards: [] }  // column4
            ],
            nextCardId: 1
        }
    },

    methods: {
        save() {
            const data = {
                columns: this.columns,
                nextCardId: this.nextCardId
            }
            localStorage.setItem('kanban-board-v2', JSON.stringify(data))
        },

        load() {
            const saved = localStorage.getItem('kanban-board-v2')
            if (saved) {
                const data = JSON.parse(saved)
                
                this.columns = data.columns || this.columns
                this.nextCardId = data.nextCardId || 1
            }
        },
        addCardToColumn(columnIndex, card) {
            if (columnIndex === 0) {
                card.id = this.nextCardId++
            }
            if (columnIndex === 3) {
                
                const deadlineDate = new Date(card.deadline)
                const completionDate = new Date()
                card.current = completionDate <= deadlineDate
            }
            this.columns[columnIndex].cards.push(card)
            this.save()  
        }
    },
    mounted() {
        this.load()  // сначала загружаем

        // Теперь все события идут через один метод addCardToColumn
        eventBus.$on('addColumn1', card => {
            this.addCardToColumn(0, card)
        })
        eventBus.$on('addColumn2', card => {
            this.addCardToColumn(1, card)
        })
        eventBus.$on('addColumn3', card => {
            this.addCardToColumn(2, card)
        })
        eventBus.$on('addColumn4', card => {
            this.addCardToColumn(3, card)
        })

        // Дополнительно: сохраняем при любых изменениях внутри колонок
        // (удаление, редактирование, перемещение по кнопкам)
        eventBus.$on('cardUpdated', () => {
            this.save()
        })
        eventBus.$on('cardDeleted', () => {
            this.save()
        })
    },

    beforeDestroy() {
        this.save()
    }
})
   

Vue.component('newcard', {
    template: `
    <div>
        <button @click="openModal = true">Создать карточку</button>
        <div v-if="openModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Заполните карточку</h3>
                    <button @click="openModal = false" class="btn-close">×</button>
                </div>
                <form class="addform" @submit.prevent="onSubmit">
                    <p>
                        <label for="intitle">Заголовок</label>
                        <input id="intitle" required v-model="title" maxlength="30" type="text" placeholder="заголовок">
                    </p>
                    <p>
                        <label for="indescription">Описание</label>
                        <textarea required id="indescription" rows="5" cols="10" v-model="description" maxlength="60"></textarea>
                    </p>
                    <p>
                        <label for="indeadline">Дедлайн</label>
                        <input required type="date" id="indeadline" v-model="deadline">
                    </p>
                    <button type="submit" class="btn-submit">Добавить карточку</button>
                </form>
            </div>
        </div>
    </div>
    `,
    data() {
        return {
            title: null,
            description: null,
            deadline: null,
            openModal: false
        }
    },
    methods: {
        onSubmit() {
            let card = {
                title: this.title,
                description: this.description,
                date: new Date().toLocaleDateString().split("-").reverse().join("-"),
                deadline: this.deadline,
                reason: null,
                transfer: false,
                edit: null,
                editB: false,
                current: true,
            }
            eventBus.$emit('addColumn1', card)
            this.title = null
            this.deadline = null
            this.description = null
            this.openModal = false
            console.log(card)
        }
    }
})

let app = new Vue({
    el: '#app',
    data: {
        name: 'Kanban'
    }
})